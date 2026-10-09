import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { SESSION_COOKIE, validSession } from "@/lib/auth";
import { sendLineMessage } from "@/lib/line";
import { supabase } from "@/lib/supabase";
import type { Appointment } from "@/schema";

const appointmentLabels: Record<Appointment["appointment_type"], string> = {
  installation: "ติดตั้งหน้างาน",
  pickup: "รับที่ร้าน",
  site_visit: "ดูหน้างาน",
};

// Each click sends a new LINE message; preserve the first successful reminder time.
export async function POST(request: NextRequest) {
  if (!validSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบหัวหน้า" }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "ไม่อนุญาตคำขอจากภายนอก" }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "กรุณาระบุ id นัดหมายที่ถูกต้อง" }, { status: 400 });
  }
  // The schema stores TIMESTAMP without a timezone, in Bangkok local time.
  const clickedAt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, -1);
  let lineAccepted = false;
  try {
    const { data, error } = await supabase.from("appointment").select("*").eq("appointment_id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "ไม่พบนัดหมายนี้" }, { status: 404 });
    const appointment = data as Appointment;
    if (appointment.status !== "pending") {
      return NextResponse.json({ error: "ส่งแจ้งเตือนได้เฉพาะนัดหมายที่รอดำเนินการ" }, { status: 409 });
    }
    const projectResult = await supabase.from("project").select("status, order_name")
      .eq("project_id", appointment.project_id).maybeSingle();
    if (projectResult.error) throw projectResult.error;
    if (!projectResult.data) {
      return NextResponse.json({ error: "ไม่พบงานของนัดหมายนี้" }, { status: 404 });
    }
    if (["completed", "reject"].includes(projectResult.data.status)) {
      return NextResponse.json({ error: "งานนี้ปิดงานหรือถูกปฏิเสธแล้ว" }, { status: 409 });
    }
    const customerResult = await supabase.from("customer").select("customer_name, line_user_id")
      .eq("customer_id", appointment.customer_id).maybeSingle();
    if (customerResult.error) throw customerResult.error;
    if (!customerResult.data) {
      return NextResponse.json({ error: "ไม่พบลูกค้าของนัดหมายนี้" }, { status: 404 });
    }
    const recipient = customerResult.data.line_user_id?.trim();
    if (!recipient) {
      return NextResponse.json({ error: "ลูกค้ารายนี้ยังไม่มี LINE user ID" }, { status: 422 });
    }
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()) {
      return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN" }, { status: 503 });
    }

    // TIMESTAMP values without an offset represent Bangkok local time, not server time.
    const datetime = appointment.appointment_datetime;
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(datetime) ? datetime : `${datetime}+07:00`);
    const formattedDate = new Intl.DateTimeFormat("th-TH", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Bangkok",
    }).format(date);
    const message = [
      `สวัสดีคุณ ${customerResult.data.customer_name}`,
      "แจ้งเตือนนัดหมายจาก RubMao",
      `งาน: ${projectResult.data.order_name}`,
      `ประเภทนัดหมาย: ${appointmentLabels[appointment.appointment_type]}`,
      `วันเวลา: ${formattedDate} น. (เวลาไทย)`,
      `สถานที่: ${appointment.location}`,
    ].join("\n");
    try {
      await sendLineMessage(recipient, message, { retryKey: randomUUID() });
    } catch (error) {
      console.error("Appointment LINE reminder:", error instanceof Error ? error.message : "Unknown LINE request error");
      return NextResponse.json({ error: "ส่งคำขอแจ้งเตือน LINE ไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 502 });
    }
    lineAccepted = true;

    if (!appointment.reminder_sent_at) {
      // Compare-and-set prevents overlapping requests from overwriting the first time.
      const { data: saved, error: saveError } = await supabase.from("appointment")
        .update({ reminder_status: "sent", reminder_sent_at: clickedAt })
        .eq("appointment_id", id).is("reminder_sent_at", null).select("*").maybeSingle();
      if (saveError) throw saveError;
      if (saved) return NextResponse.json({ appointment: saved });
    }
    // A resend (or a concurrent first send) updates status without changing the first time.
    const { data: latest, error: latestError } = await supabase.from("appointment")
      .update({ reminder_status: "sent" }).eq("appointment_id", id)
      .not("reminder_sent_at", "is", null).select("*").maybeSingle();
    if (latestError) throw latestError;
    if (!latest) throw new Error("Appointment disappeared while recording reminder");
    return NextResponse.json({ appointment: latest });
  } catch {
    return NextResponse.json({
      error: lineAccepted
        ? "LINE รับคำขอแจ้งเตือนแล้ว แต่บันทึกสถานะไม่สำเร็จ"
        : "โหลดข้อมูลแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง",
    }, { status: 500 });
  }
}
