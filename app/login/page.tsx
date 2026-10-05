"use client";

import { useState, type FormEvent } from "react";
import { Hammer, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message || "เข้าสู่ระบบไม่สำเร็จ");
        setBusy(false);
        return;
      }
      window.location.replace("/");
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
      setBusy(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
    <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-white"><Hammer size={26} /></span>
        <div><strong className="text-xl">RubMao</strong><p className="text-sm text-muted-foreground">ระบบจัดการงานของร้าน</p></div>
      </div>
      <h1 className="mb-2 text-2xl font-semibold">เข้าสู่ระบบ</h1>
      <p className="mb-6 text-sm text-muted-foreground">เข้าสู่พื้นที่ทำงานสำหรับหัวหน้า</p>
      <form onSubmit={submit} className="space-y-5">
        <label className="block">ชื่อผู้ใช้<input className="mt-2 w-full" autoComplete="username" name="username" required maxLength={256} value={username} onChange={(e) => setUsername(e.target.value)} disabled={busy} /></label>
        <label className="block">รหัสผ่าน<input className="mt-2 w-full" type="password" autoComplete="current-password" name="password" required maxLength={1024} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} /></label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white disabled:opacity-60"><LockKeyhole size={17} />{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
      </form>
    </div>
  </main>;
}
