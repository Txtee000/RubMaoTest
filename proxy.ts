import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, validSession } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/api/auth/login") {
    return NextResponse.next();
  }
  const authenticated = validSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (path === "/login") {
    return authenticated ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (authenticated) return NextResponse.next();
  if (path.startsWith("/api/")) {
    return NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg).*)"],
};
