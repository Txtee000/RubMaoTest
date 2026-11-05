import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const projectId = new URL(request.url).searchParams.get("project_id");
    if (projectId !== null && !/^[0-9]+$/.test(projectId)) {
      return NextResponse.json({ error: "project_id ต้องเป็นจำนวนเต็ม" }, { status: 400 });
    }

    let query = supabase.from("project_status_log").select("*")
      .order("changed_at", { ascending: true })
      .order("log_id", { ascending: true });
    if (projectId !== null) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) {
      console.error("GET project_status_log:", error);
      return NextResponse.json({ error: "โหลดประวัติสถานะไม่สำเร็จ" }, {
        status: error.code === "42501" ? 403 : 500,
      });
    }
    return NextResponse.json({ status_logs: data }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET project_status_log:", error);
    return NextResponse.json({ error: "โหลดประวัติสถานะไม่สำเร็จ" }, { status: 500 });
  }
}
