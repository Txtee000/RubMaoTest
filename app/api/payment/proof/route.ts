import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, validSession } from "@/lib/auth";
import { PROOF_MAX_SIZE, PROOF_TYPES } from "@/lib/payment-proof";

const bucket = "payment-proofs";
function storage() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("กรุณาตั้งค่า SUPABASE_SERVICE_ROLE_KEY ฝั่งเซิร์ฟเวอร์ก่อนแนบหลักฐาน");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function POST(request: NextRequest) {
  if (!validSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "ไม่อนุญาตคำขอจากภายนอก" }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("project_id") ?? "");
    if (!/^\d+$/.test(projectId) || !(file instanceof File) || !PROOF_TYPES[file.type] || file.size <= 0 || file.size > PROOF_MAX_SIZE) {
      return NextResponse.json({ error: "เลือก JPG, PNG, WebP หรือ PDF ขนาดไม่เกิน 3 MB" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const valid = file.type === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
      : file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : file.type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!valid) return NextResponse.json({ error: "เนื้อหาไฟล์ไม่ตรงกับประเภทที่เลือก" }, { status: 400 });
    const client = storage();
    const { data: project, error: projectError } = await client.from("project").select("project_id").eq("project_id", projectId).maybeSingle();
    if (projectError || !project) return NextResponse.json({ error: "ไม่พบงานสำหรับแนบหลักฐาน" }, { status: 400 });
    const path = `${projectId}/${crypto.randomUUID()}.${PROOF_TYPES[file.type]}`;
    const { error } = await client.storage.from(bucket).upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) {
      console.error("Payment proof upload:", { message: error.message, statusCode: error.statusCode });
      const reason = error.message.toLowerCase();
      const message = reason.includes("bucket") && reason.includes("not found")
        ? "ไม่พบ bucket payment-proofs กรุณาสร้างใน Supabase Storage ของโปรเจกต์นี้"
        : reason.includes("row-level security") || reason.includes("unauthorized") || reason.includes("jwt")
          ? "ไม่มีสิทธิ์อัปโหลด ตรวจ SUPABASE_SERVICE_ROLE_KEY ว่าเป็นคีย์ฝั่งเซิร์ฟเวอร์ของโปรเจกต์เดียวกัน แล้วรีสตาร์ตแอป"
          : reason.includes("mime")
            ? "Bucket ไม่อนุญาตประเภทไฟล์นี้ ตรวจ Allowed MIME types ใน Supabase Storage"
            : reason.includes("size") || reason.includes("too large")
              ? "ไฟล์เกินขนาดที่ bucket อนุญาต ตรวจ File size limit ใน Supabase Storage"
              : "อัปโหลดหลักฐานไม่สำเร็จ ตรวจการตั้งค่า Supabase Storage";
      return NextResponse.json({ error: process.env.NODE_ENV === "development" ? `${message}: ${error.message}` : message }, { status: 500 });
    }
    return NextResponse.json({ path, name: file.name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
}
export async function GET(request: NextRequest) {
  if (!validSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!/^\d+\/[\da-f-]+\.(jpg|png|webp|pdf)$/.test(path)) return NextResponse.json({ error: "เส้นทางไฟล์ไม่ถูกต้อง" }, { status: 400 });
  try {
    const { data, error } = await storage().storage.from(bucket).createSignedUrl(path, 60);
    if (error) return NextResponse.json({ error: "เปิดหลักฐานไม่สำเร็จ" }, { status: 404 });
    const response = NextResponse.redirect(data.signedUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return NextResponse.json({ error: "ตรวจการตั้งค่า Storage ฝั่งเซิร์ฟเวอร์" }, { status: 500 }); }
}
