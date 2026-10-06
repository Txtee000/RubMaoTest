import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET: อ่านรายการทั้งหมด หรือกรองด้วย query string
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let query = supabase.from("appointment").select("*");
    const id = searchParams.get("id") ?? searchParams.get("appointment_id");
    if (id && !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "id ต้องเป็นจำนวนเต็ม" }, { status: 400 });
    }
    if (id) query = query.eq("appointment_id", id);
    const project_id = searchParams.get("project_id");
    if (project_id && !/^[0-9]+$/.test(project_id)) {
      return NextResponse.json({ error: "project_id ต้องเป็นจำนวนเต็ม" }, { status: 400 });
    }
    if (project_id) query = query.eq("project_id", project_id);
    const customer_id = searchParams.get("customer_id");
    if (customer_id && !/^[0-9]+$/.test(customer_id)) {
      return NextResponse.json({ error: "customer_id ต้องเป็นจำนวนเต็ม" }, { status: 400 });
    }
    if (customer_id) query = query.eq("customer_id", customer_id);
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);
    const appointment_type = searchParams.get("appointment_type");
    if (appointment_type) query = query.eq("appointment_type", appointment_type);

    const { data, error } = await query;
    if (error) return databaseError(error, "โหลดข้อมูล");

    return NextResponse.json({ appointments: data }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET appointment:", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// POST: สร้างรายการใหม่ โดยรับข้อมูลจาก JSON body
export async function POST(request: Request) {
  if (!allowedOrigin(request)) {
    return NextResponse.json({ error: "ไม่อนุญาตคำขอจากภายนอก" }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "กรุณาส่ง JSON object" }, { status: 400 });
    }

    const payload = {
      project_id: body.project_id,
      customer_id: body.customer_id,
      appointment_type: body.appointment_type,
      location: body.location,
      appointment_datetime: body.appointment_datetime,
      status: body.status,
      reminder_status: body.reminder_status ?? "pending",
      reminder_sent_at: body.reminder_sent_at ?? null,
    };
    const message = validatePayload(payload);
    if (message) {
      console.error(`appointment validation: ${message}`);
      return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("appointment")
      .insert(payload)
      .select("*")
      .single();

    if (error) return databaseError(error, "เพิ่มข้อมูล");
    return NextResponse.json({ appointment: data }, { status: 201 });
  } catch (error) {
    console.error("POST appointment:", error);
    return NextResponse.json({ error: "เพิ่มข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// PUT: แก้ไขรายการที่ระบุ ส่งเฉพาะช่องที่ต้องการแก้ไขได้
export async function PUT(request: Request) {
  if (!allowedOrigin(request)) {
    return NextResponse.json({ error: "ไม่อนุญาตคำขอจากภายนอก" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? searchParams.get("appointment_id");
    if (!id || !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "กรุณาระบุ id ที่ถูกต้อง" }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "กรุณาส่ง JSON object" }, { status: 400 });
    }

    // รับเฉพาะคอลัมน์ที่แก้ไขได้ใน schema
    const fields = ["project_id","customer_id","appointment_type","location","appointment_datetime","status","reminder_status","reminder_sent_at"];
    const updates: Record<string, unknown> = {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "กรุณาระบุข้อมูลที่ต้องการแก้ไข" }, { status: 400 });
    }
    const message = validatePayload(updates, true);
    if (message) {
      console.error(`appointment validation: ${message}`);
      return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("appointment")
      .update(updates)
      .eq("appointment_id", id)
      .select("*")
      .maybeSingle();

    if (error) return databaseError(error, "แก้ไขข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข" }, { status: 404 });
    return NextResponse.json({ appointment: data });
  } catch (error) {
    console.error("PUT appointment:", error);
    return NextResponse.json({ error: "แก้ไขข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// DELETE: ลบเฉพาะรายการที่ระบุรหัสไว้
export async function DELETE(request: Request) {
  if (!allowedOrigin(request)) {
    return NextResponse.json({ error: "ไม่อนุญาตคำขอจากภายนอก" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? searchParams.get("appointment_id");
    if (!id || !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "กรุณาระบุ id ที่ถูกต้อง" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("appointment")
      .delete()
      .eq("appointment_id", id)
      .select("appointment_id")
      .maybeSingle();

    if (error) return databaseError(error, "ลบข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์ลบ" }, { status: 404 });
    return NextResponse.json({ message: "ลบข้อมูลแล้ว", deleted: data });
  } catch (error) {
    console.error("DELETE appointment:", error);
    return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ตรวจข้อมูลก่อนส่งไป Supabase; partial ใช้เมื่อแก้ไขบางช่อง
function validatePayload(payload: Record<string, unknown>, partial = false): string | null {
  if (!partial) {
    const required = ["project_id","customer_id","appointment_type","location","appointment_datetime","status","reminder_status"];
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null) return `กรุณาระบุ ${field}`;
    }
  }
  if (payload.project_id !== undefined) {
    const id = payload.project_id;
    if (!((typeof id === "number" && Number.isSafeInteger(id) && id >= 0) ||
      (typeof id === "string" && /^[0-9]+$/.test(id)))) {
      return "project_id ต้องเป็นจำนวนเต็ม";
    }
  }
  if (payload.customer_id !== undefined) {
    const id = payload.customer_id;
    if (!((typeof id === "number" && Number.isSafeInteger(id) && id >= 0) ||
      (typeof id === "string" && /^[0-9]+$/.test(id)))) {
      return "customer_id ต้องเป็นจำนวนเต็ม";
    }
  }
  if (payload.appointment_type !== undefined) {
    if (typeof payload.appointment_type !== "string" || !["site_visit", "pickup"].includes(payload.appointment_type)) return "appointment_type ต้องเป็น site_visit, pickup";
  }
  if (payload.location !== undefined) {
    if (typeof payload.location !== "string" || payload.location.length > 10000 || !payload.location.trim()) return "location ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 10000 ตัวอักษร";
  }
  if (payload.appointment_datetime !== undefined) {
    if (typeof payload.appointment_datetime !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(payload.appointment_datetime) || !Number.isFinite(Date.parse(payload.appointment_datetime))) return "appointment_datetime ต้องเป็นวันที่แบบ ISO 8601";
  }
  if (payload.status !== undefined) {
    if (typeof payload.status !== "string" || payload.status.length > 50 || !payload.status.trim()) return "status ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 50 ตัวอักษร";
  }
  if (payload.reminder_status !== undefined) {
    if (typeof payload.reminder_status !== "string" || !["pending","send","failed"].includes(payload.reminder_status)) return "reminder_status ต้องเป็น pending, send, failed";
  }
  if (payload.reminder_sent_at !== undefined && payload.reminder_sent_at !== null) {
    if (typeof payload.reminder_sent_at !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(payload.reminder_sent_at) || !Number.isFinite(Date.parse(payload.reminder_sent_at))) return "reminder_sent_at ต้องเป็นวันที่แบบ ISO 8601";
  }
  return null;
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

// 409: รหัสซ้ำหรือมีข้อมูลอ้างอิง; 403: ไม่มีสิทธิ์; 400: ข้อมูลไม่ตรง schema
function databaseError(error: { code: string; message: string }, action: string) {
  console.error(`appointment ${action}:`, error);
  if (error.code === "23505") {
    return NextResponse.json({ error: "มีรายการที่ใช้รหัสนี้อยู่แล้ว" }, { status: 409 });
  }
  if (error.code === "23503") {
    return NextResponse.json({ error: "ข้อมูลอ้างอิงไม่ถูกต้อง หรือรายการนี้มีข้อมูลอื่นอ้างอิงอยู่" }, { status: 409 });
  }
  if (error.code === "42501") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการกับข้อมูลนี้" }, { status: 403 });
  }
  if (error.code.startsWith("22") || error.code.startsWith("23")) {
    return NextResponse.json({
      error: process.env.NODE_ENV === "development"
        ? `ข้อมูลไม่ตรงกับโครงสร้างตาราง [${error.code}]: ${error.message}`
        : "ข้อมูลไม่ตรงกับโครงสร้างตาราง",
      code: error.code,
    }, { status: 400 });
  }
  return NextResponse.json({
    error: process.env.NODE_ENV === "development"
      ? `${action}ไม่สำเร็จ [${error.code}]: ${error.message}`
      : `${action}ไม่สำเร็จ`,
    code: error.code,
  }, { status: 500 });
}
