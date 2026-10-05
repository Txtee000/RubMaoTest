import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET: อ่านรายการทั้งหมด หรือกรองด้วย query string
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let query = supabase.from("work_on").select("*");
    const employee_id = searchParams.get("employee_id");
    if (employee_id) query = query.eq("employee_id", employee_id);
    const project_id = searchParams.get("project_id");
    if (project_id) query = query.eq("project_id", project_id);

    const { data, error } = await query;
    if (error) return databaseError(error, "โหลดข้อมูล");

    return NextResponse.json({ assignments: data }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET work_on:", error);
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
      employee_id: body.employee_id,
      project_id: body.project_id,
    };
    const message = validatePayload(payload);
    if (message) return NextResponse.json({ error: message }, { status: 400 });

    const { data, error } = await supabase
      .from("work_on")
      .insert(payload)
      .select("*")
      .single();

    if (error) return databaseError(error, "เพิ่มข้อมูล");
    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error) {
    console.error("POST work_on:", error);
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
    const employee_id = searchParams.get("employee_id");
    const project_id = searchParams.get("project_id");
    if (!employee_id || !project_id || employee_id.length > 36 || project_id.length > 36) {
      return NextResponse.json({ error: "กรุณาระบุ employee_id และ project_id" }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "กรุณาส่ง JSON object" }, { status: 400 });
    }

    // รับเฉพาะคอลัมน์ที่แก้ไขได้ใน schema
    const fields = ["employee_id","project_id"];
    const updates: Record<string, unknown> = {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "กรุณาระบุข้อมูลที่ต้องการแก้ไข" }, { status: 400 });
    }
    const message = validatePayload(updates, true);
    if (message) return NextResponse.json({ error: message }, { status: 400 });

    const { data, error } = await supabase
      .from("work_on")
      .update(updates)
      .eq("employee_id", employee_id)
      .eq("project_id", project_id)
      .select("*")
      .maybeSingle();

    if (error) return databaseError(error, "แก้ไขข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข" }, { status: 404 });
    return NextResponse.json({ assignment: data });
  } catch (error) {
    console.error("PUT work_on:", error);
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
    const employee_id = searchParams.get("employee_id");
    const project_id = searchParams.get("project_id");
    if (!employee_id || !project_id || employee_id.length > 36 || project_id.length > 36) {
      return NextResponse.json({ error: "กรุณาระบุ employee_id และ project_id" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("work_on")
      .delete()
      .eq("employee_id", employee_id)
      .eq("project_id", project_id)
      .select("employee_id, project_id")
      .maybeSingle();

    if (error) return databaseError(error, "ลบข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์ลบ" }, { status: 404 });
    return NextResponse.json({ message: "ลบข้อมูลแล้ว", deleted: data });
  } catch (error) {
    console.error("DELETE work_on:", error);
    return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ตรวจข้อมูลก่อนส่งไป Supabase; partial ใช้เมื่อแก้ไขบางช่อง
function validatePayload(payload: Record<string, unknown>, partial = false): string | null {
  if (!partial) {
    const required = ["employee_id","project_id"];
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null) return `กรุณาระบุ ${field}`;
    }
  }
  if (payload.employee_id !== undefined) {
    if (typeof payload.employee_id !== "string" || payload.employee_id.length > 36 || !payload.employee_id.trim()) return "employee_id ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 36 ตัวอักษร";
  }
  if (payload.project_id !== undefined) {
    if (typeof payload.project_id !== "string" || payload.project_id.length > 36 || !payload.project_id.trim()) return "project_id ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 36 ตัวอักษร";
  }
  return null;
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

// 409: รหัสซ้ำหรือมีข้อมูลอ้างอิง; 403: ไม่มีสิทธิ์; 400: ข้อมูลไม่ตรง schema
function databaseError(error: { code: string; message: string }, action: string) {
  console.error(`work_on ${action}:`, error);
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
    return NextResponse.json({ error: "ข้อมูลไม่ตรงกับโครงสร้างตาราง" }, { status: 400 });
  }
  return NextResponse.json({ error: `${action}ไม่สำเร็จ` }, { status: 500 });
}
