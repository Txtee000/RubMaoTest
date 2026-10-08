import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, validSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Appointment } from "@/schema";

// Record a manual reminder action in the database; repeated clicks are allowed.
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
  try {
    const { data, error } = await supabase.from("appointment").select("*").eq("appointment_id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "ไม่พบนัดหมายนี้" }, { status: 404 });
    const appointment = data as Appointment;
    if (appointment.status !== "pending") {
      return NextResponse.json({ error: "ส่งแจ้งเตือนได้เฉพาะนัดหมายที่รอดำเนินการ" }, { status: 409 });
    }
    const projectResult = await supabase.from("project").select("status")
      .eq("project_id", appointment.project_id).maybeSingle();
    if (projectResult.error) throw projectResult.error;
    if (!projectResult.data) {
      return NextResponse.json({ error: "ไม่พบงานของนัดหมายนี้" }, { status: 404 });
    }
    if (["completed", "reject"].includes(projectResult.data.status)) {
      return NextResponse.json({ error: "งานนี้ปิดงานหรือถูกปฏิเสธแล้ว" }, { status: 409 });
    }
    if (appointment.reminder_sent_at) {
      if (appointment.reminder_status === "sent") return NextResponse.json({ appointment });
      // The previous CRUD API allowed a timestamp alongside pending/failed.
      const { data: promoted, error: promoteError } = await supabase.from("appointment")
        .update({ reminder_status: "sent" }).eq("appointment_id", id).select("*").maybeSingle();
      if (promoteError) throw promoteError;
      if (!promoted) throw new Error("Appointment disappeared while recording reminder");
      return NextResponse.json({ appointment: promoted });
    }
    // Compare-and-set prevents overlapping requests from overwriting the first time.
    const { data: saved, error: saveError } = await supabase.from("appointment")
      .update({ reminder_status: "sent", reminder_sent_at: clickedAt })
      .eq("appointment_id", id).is("reminder_sent_at", null).select("*").maybeSingle();
    if (saveError) throw saveError;
    if (saved) return NextResponse.json({ appointment: saved });
    const { data: latest, error: latestError } = await supabase.from("appointment")
      .select("*").eq("appointment_id", id).maybeSingle();
    if (latestError) throw latestError;
    if (!latest) throw new Error("Appointment disappeared while recording reminder");
    return NextResponse.json({ appointment: latest });
  } catch {
    return NextResponse.json({ error: "บันทึกการแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  }
}
