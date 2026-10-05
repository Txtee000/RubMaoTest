import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";



export async function GET(request: Request){
    

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")
    const status= searchParams.get("status")


    let query = supabase.from("project").select(`
        project_id,
        customer_id,
        order_name,
        description_project,
        status,
        base_cost,
        labor_cost,
        service_percent,
        final_cost,
        
    `);

    if(id){
                                                                                                       
    }
    const { data, error} = await supabase.from("project").select("*");

    if(error) {
        console.error("โหลดโครงการไม่สำเร็จ: ", error);
        return NextResponse.json(
            { error: "โหลดข้อมูลโครงการไม่สำเร็จ" },
            { status: 500 },
        );
    }



    return NextResponse.json({ projects: data });
}

export async function POST(request: Request){
    const {data, eror}
}