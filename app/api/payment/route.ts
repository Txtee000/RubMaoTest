import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET: อ่านรายการทั้งหมด หรือกรองด้วย query string
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let query = supabase.from("payment").select("*");
    const id = searchParams.get("id") ?? searchParams.get("payment_id");
    if (id) query = query.eq("payment_id", id);
    const project_id = searchParams.get("project_id");
    if (project_id) query = query.eq("project_id", project_id);
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return databaseError(error, "โหลดข้อมูล");

    return NextResponse.json({ payments: data }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET payment:", error);
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
      payment_id: body.payment_id ?? crypto.randomUUID(),
      project_id: body.project_id,
      proof_of_payment: body.proof_of_payment ?? null,
      payment_date: body.payment_date ?? null,
      status: body.status,
      amount: body.amount,
    };
    const message = validatePayload(payload);
    if (message) return NextResponse.json({ error: message }, { status: 400 });

    const { data, error } = await supabase
      .from("payment")
      .insert(payload)
      .select("*")
      .single();

    if (error) return databaseError(error, "เพิ่มข้อมูล");
    return NextResponse.json({ payment: data }, { status: 201 });
  } catch (error) {
    console.error("POST payment:", error);
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
    const id = searchParams.get("id") ?? searchParams.get("payment_id");
    if (!id || id.length > 36) {
      return NextResponse.json({ error: "กรุณาระบุ id ที่ถูกต้อง" }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "กรุณาส่ง JSON object" }, { status: 400 });
    }

    // รับเฉพาะคอลัมน์ที่แก้ไขได้ใน schema
    const fields = ["project_id","proof_of_payment","payment_date","status","amount"];
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
      .from("payment")
      .update(updates)
      .eq("payment_id", id)
      .select("*")
      .maybeSingle();

    if (error) return databaseError(error, "แก้ไขข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข" }, { status: 404 });
    return NextResponse.json({ payment: data });
  } catch (error) {
    console.error("PUT payment:", error);
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
    const id = searchParams.get("id") ?? searchParams.get("payment_id");
    if (!id || id.length > 36) {
      return NextResponse.json({ error: "กรุณาระบุ id ที่ถูกต้อง" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("payment")
      .delete()
      .eq("payment_id", id)
      .select("payment_id")
      .maybeSingle();

    if (error) return databaseError(error, "ลบข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์ลบ" }, { status: 404 });
    return NextResponse.json({ message: "ลบข้อมูลแล้ว", deleted: data });
  } catch (error) {
    console.error("DELETE payment:", error);
    return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ตรวจข้อมูลก่อนส่งไป Supabase; partial ใช้เมื่อแก้ไขบางช่อง
function validatePayload(payload: Record<string, unknown>, partial = false): string | null {
  if (!partial) {
    const required = ["payment_id","project_id","status","amount"];
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null) return `กรุณาระบุ ${field}`;
    }
  }
  if (payload.payment_id !== undefined) {
    if (typeof payload.payment_id !== "string" || payload.payment_id.length > 36 || !payload.payment_id.trim()) return "payment_id ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 36 ตัวอักษร";
  }
  if (payload.project_id !== undefined) {
    if (typeof payload.project_id !== "string" || payload.project_id.length > 36 || !payload.project_id.trim()) return "project_id ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 36 ตัวอักษร";
  }
  if (payload.proof_of_payment !== undefined && payload.proof_of_payment !== null) {
    if (typeof payload.proof_of_payment !== "string" || payload.proof_of_payment.length > 10000) return "proof_of_payment ต้องเป็นข้อความ ยาวไม่เกิน 10000 ตัวอักษร";
  }
  if (payload.payment_date !== undefined && payload.payment_date !== null) {
    if (typeof payload.payment_date !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(payload.payment_date) || !Number.isFinite(Date.parse(payload.payment_date))) return "payment_date ต้องเป็นวันที่แบบ ISO 8601";
  }
  if (payload.status !== undefined) {
    if (typeof payload.status !== "string" || payload.status.length > 50 || !payload.status.trim()) return "status ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 50 ตัวอักษร";
  }
  if (payload.amount !== undefined) {
    if (typeof payload.amount !== "number" || !Number.isFinite(payload.amount) || payload.amount < 0) return "amount ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
  }
  return null;
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

// 409: รหัสซ้ำหรือมีข้อมูลอ้างอิง; 403: ไม่มีสิทธิ์; 400: ข้อมูลไม่ตรง schema
function databaseError(error: { code: string; message: string }, action: string) {
  console.error(`payment ${action}:`, error);
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
