import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET: อ่านรายการทั้งหมด หรือกรองด้วย query string
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let query = supabase.from("project").select("project_id, customer_id, description_project, status, base_cost, labor_cost, service_percent, final_cost, order_name");
    const id = searchParams.get("id") ?? searchParams.get("project_id");
    if (id && !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "project_id ต้องเป็นจำนวนเต็ม" }, { status: 400 });
    }
    if (id) query = query.eq("project_id", id);
    const customer_id = searchParams.get("customer_id");
    if (customer_id && !/^[0-9]+$/.test(customer_id)) {
      return NextResponse.json({ error: "customer_id ต้องเป็นจำนวนเต็ม" }, { status: 400 });
    }
    if (customer_id) query = query.eq("customer_id", customer_id);
    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return databaseError(error, "โหลดข้อมูล");

    return NextResponse.json({ projects: data }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET project:", error);
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
      customer_id: body.customer_id,
      description_project: body.description_project ?? null,
      status: body.status,
      base_cost: body.base_cost,
      labor_cost: body.labor_cost,
      service_percent: body.service_percent,
      final_cost: body.final_cost,
      order_name: body.order_name,
    };
    console.log(payload)
    const message = validatePayload(payload);
    if (message) {
      console.error(`POST project validation: ${message}`);
      return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("project")
      .insert(payload)
      .select("project_id, customer_id, description_project, status, base_cost, labor_cost, service_percent, final_cost, order_name")
      .single();

    if (error) return databaseError(error, "เพิ่มข้อมูล");
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    console.error("POST project:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: process.env.NODE_ENV === "development" ? `เพิ่มข้อมูลไม่สำเร็จ: ${message}` : "เพิ่มข้อมูลไม่สำเร็จ",
    }, { status: 500 });
  }
}

// PUT: แก้ไขรายการที่ระบุ ส่งเฉพาะช่องที่ต้องการแก้ไขได้
export async function PUT(request: Request) {
  if (!allowedOrigin(request)) {
    return NextResponse.json({ error: "ไม่อนุญาตคำขอจากภายนอก" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? searchParams.get("project_id");
    if (!id || !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "กรุณาระบุ id ที่ถูกต้อง" }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "กรุณาส่ง JSON object" }, { status: 400 });
    }

    // รับเฉพาะคอลัมน์ที่แก้ไขได้ใน schema
    const fields = [
      "customer_id", "description_project", "status", "base_cost", "labor_cost",
      "service_percent", "final_cost", "order_name",
    ];
    const updates: Record<string, unknown> = {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "กรุณาระบุข้อมูลที่ต้องการแก้ไข" }, { status: 400 });
    }
    const message = validatePayload(updates, true);
    if (message) return NextResponse.json({ error: message }, { status: 400 });

    let query = supabase.from("project").update(updates).eq("project_id", id);
    if (updates.status === "reject") {
      query = query.eq("status", "estimated");
    }
    const { data, error } = await query
      .select("project_id, customer_id, description_project, status, base_cost, labor_cost, service_percent, final_cost, order_name")
      .maybeSingle();

    if (error) return databaseError(error, "แก้ไขข้อมูล");
    if (!data && updates.status === "reject") {
      return NextResponse.json({ error: "ยกเลิกงานได้เฉพาะสถานะรอลูกค้าตกลง" }, { status: 409 });
    }
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข" }, { status: 404 });
    return NextResponse.json({ project: data });
  } catch (error) {
    console.error("PUT project:", error);
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
    const id = searchParams.get("id") ?? searchParams.get("project_id");
    if (!id || !/^[0-9]+$/.test(id)) {
      return NextResponse.json({ error: "กรุณาระบุ id ที่ถูกต้อง" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("project")
      .delete()
      .eq("project_id", id)
      .select("project_id")
      .maybeSingle();

    if (error) return databaseError(error, "ลบข้อมูล");
    if (!data) return NextResponse.json({ error: "ไม่พบรายการ หรือไม่มีสิทธิ์ลบ" }, { status: 404 });
    return NextResponse.json({ message: "ลบข้อมูลแล้ว", deleted: data });
  } catch (error) {
    console.error("DELETE project:", error);
    return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ตรวจข้อมูลก่อนส่งไป Supabase; partial ใช้เมื่อแก้ไขบางช่อง
function validatePayload(payload: Record<string, unknown>, partial = false): string | null {
  if (!partial) {
    const required = ["customer_id","status","base_cost","labor_cost","service_percent","final_cost","order_name"];
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null) return `กรุณาระบุ ${field}`;
    }
  }
  if (payload.customer_id !== undefined) {
    const id = payload.customer_id;
    if (!((typeof id === "number" && Number.isSafeInteger(id) && id >= 0) ||
      (typeof id === "string" && /^[0-9]+$/.test(id)))) {
      return "customer_id ต้องเป็นจำนวนเต็ม";
    }
  }
  if (payload.description_project !== undefined && payload.description_project !== null) {
    if (typeof payload.description_project !== "string" || payload.description_project.length > 10000) return "description_project ต้องเป็นข้อความ ยาวไม่เกิน 10000 ตัวอักษร";
  }
  if (payload.status !== undefined) {
    if (typeof payload.status !== "string" || payload.status.length > 50 || !payload.status.trim()) return "status ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 50 ตัวอักษร";
  }
  if (payload.base_cost !== undefined) {
    if (typeof payload.base_cost !== "number" || !Number.isFinite(payload.base_cost) || payload.base_cost < 0) return "base_cost ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
  }
  if (payload.labor_cost !== undefined) {
    if (typeof payload.labor_cost !== "number" || !Number.isFinite(payload.labor_cost) || payload.labor_cost < 0) return "labor_cost ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
  }
  if (payload.service_percent !== undefined) {
    if (typeof payload.service_percent !== "number" || !Number.isFinite(payload.service_percent) || payload.service_percent < 0) return "service_percent ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
  }
  if (payload.final_cost !== undefined) {
    if (typeof payload.final_cost !== "number" || !Number.isFinite(payload.final_cost) || payload.final_cost < 0) return "final_cost ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
  }
  if (payload.order_name !== undefined) {
    if (typeof payload.order_name !== "string" || payload.order_name.length > 255 || !payload.order_name.trim()) return "order_name ต้องเป็นข้อความที่ไม่ว่าง ยาวไม่เกิน 255 ตัวอักษร";
  }
  return null;
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

// 409: รหัสซ้ำหรือมีข้อมูลอ้างอิง; 403: ไม่มีสิทธิ์; 400: ข้อมูลไม่ตรง schema
function databaseError(error: { code?: string; message?: string; details?: string; hint?: string }, action: string) {
  const code = error.code ?? "UNKNOWN";
  const message = error.message ?? "Supabase ไม่ได้ส่งข้อความผิดพลาดกลับมา";
  console.error(`project ${action} [${code}]: ${message}; details: ${error.details ?? ""}; hint: ${error.hint ?? ""}`);
  if (code === "23505") {
    return NextResponse.json({ error: "มีรายการที่ใช้รหัสนี้อยู่แล้ว" }, { status: 409 });
  }
  if (code === "23503") {
    return NextResponse.json({ error: "ข้อมูลอ้างอิงไม่ถูกต้อง หรือรายการนี้มีข้อมูลอื่นอ้างอิงอยู่" }, { status: 409 });
  }
  if (code === "42501") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการกับข้อมูลนี้" }, { status: 403 });
  }
  if (code.startsWith("22") || code.startsWith("23")) {
    return NextResponse.json({
      error: process.env.NODE_ENV === "development"
        ? `ข้อมูลไม่ตรงกับโครงสร้างตาราง [${code}]: ${message}`
        : "ข้อมูลไม่ตรงกับโครงสร้างตาราง",
      code,
    }, { status: 400 });
  }
  return NextResponse.json({
    error: process.env.NODE_ENV === "development" ? `${action}ไม่สำเร็จ [${code}]: ${message}` : `${action}ไม่สำเร็จ`,
    code,
  }, { status: 500 });
}
