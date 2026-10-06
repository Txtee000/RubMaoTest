import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET: อ่านรายการทั้งหมด หรือกรองด้วย query string
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let query = supabase.from("customer").select("*");
    const id = searchParams.get("id") ?? searchParams.get("customer_id");
    if (id && !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "id ต้องเป็นจำนวนเต็ม" }, { status: 400 });
    }
    if (id) query = query.eq("customer_id", id);
    const phone_number = searchParams.get("phone_number");
    if (phone_number) query = query.eq("phone_number", phone_number);

    const { data, error } = await query;
    if (error) return databaseError(error, "โหลดข้อมูล");

    return NextResponse.json({ customers: data }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET customer:", error);
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
      customer_name: body.customer_name,
      phone_number: body.phone_number,
      line_id: body.line_id ?? null,
    };
    const message = validatePayload(payload);
    if (message) {
      console.error(`customer validation: ${message}`);
      return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("customer")
      .insert(payload)
      .select("*")
      .single();

    if (error) return databaseError(error, "เพิ่มข้อมูล");
    return NextResponse.json({ customer: data }, { status: 201 });
  } catch (error) {
    console.error("POST customer:", error);
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
    const id = searchParams.get("id") ?? searchParams.get("customer_id");
    if (!id || !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "กรุณาระบุ id ที่ถูกต้อง" }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "กรุณาส่ง JSON object" }, { status: 400 });
    }

    // รับเฉพาะคอลัมน์ที่แก้ไขได้ใน schema
    const fields = ["customer_name","phone_number","line_id"];
    const updates: Record<string, unknown> = {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "กรุณาระบุข้อมูลที่ต้องการแก้ไข" }, { status: 400 });
    }
    const message = validatePayload(updates, true);
    if (message) {
      console.error(`customer validation: ${message}`);
      return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("customer")
      .update(updates)
      .eq("customer_id", id)
      .select("*")
      .maybeSingle();

    if (error) return databaseError(error, "แก้ไขข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข" }, { status: 404 });
    return NextResponse.json({ customer: data });
  } catch (error) {
    console.error("PUT customer:", error);
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
    const id = searchParams.get("id") ?? searchParams.get("customer_id");
    if (!id || !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "กรุณาระบุ id ที่ถูกต้อง" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("customer")
      .delete()
      .eq("customer_id", id)
      .select("customer_id")
      .maybeSingle();

    if (error) return databaseError(error, "ลบข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์ลบ" }, { status: 404 });
    return NextResponse.json({ message: "ลบข้อมูลแล้ว", deleted: data });
  } catch (error) {
    console.error("DELETE customer:", error);
    return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ตรวจข้อมูลก่อนส่งไป Supabase; partial ใช้เมื่อแก้ไขบางช่อง
function validatePayload(payload: Record<string, unknown>, partial = false): string | null {
  if (!partial) {
    const required = ["customer_name","phone_number"];
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null) return `กรุณาระบุ ${field}`;
    }
  }
  if (payload.customer_name !== undefined) {
    if (typeof payload.customer_name !== "string" || payload.customer_name.length > 255 || !payload.customer_name.trim()) return "customer_name ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 255 ตัวอักษร";
  }
  if (payload.phone_number !== undefined) {
    if (typeof payload.phone_number !== "string" || payload.phone_number.length > 30 || !payload.phone_number.trim()) return "phone_number ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 30 ตัวอักษร";
  }
  if (payload.line_id !== undefined && payload.line_id !== null) {
    if (typeof payload.line_id !== "string" || payload.line_id.length > 255) return "line_id ต้องเป็นข้อความ ยาวไม่เกิน 255 ตัวอักษร";
  }
  return null;
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

// 409: รหัสซ้ำหรือมีข้อมูลอ้างอิง; 403: ไม่มีสิทธิ์; 400: ข้อมูลไม่ตรง schema
function databaseError(error: { code: string; message: string }, action: string) {
  console.error(`customer ${action}:`, error);
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
