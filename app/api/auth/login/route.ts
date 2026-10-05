import { NextRequest, NextResponse } from "next/server";
import { login, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ message: "ไม่อนุญาตคำขอจากภายนอก" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("username" in body) || !("password" in body) ||
    typeof body.username !== "string" || typeof body.password !== "string" ||
    body.username.length > 256 || body.password.length > 1024) {
    return NextResponse.json({ message: "กรอกชื่อผู้ใช้และรหัสผ่าน" }, { status: 400 });
  }
  const result = login(body.username, body.password);
  if ("error" in result) {
    return NextResponse.json({ message: result.error === "config"
      ? "ยังไม่ได้ตั้งค่าบัญชีเข้าสู่ระบบบน server"
      : "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: result.error === "config" ? 503 : 401 });
  }
  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
  });
  return response;
}
