"use client";

import { useState } from "react";
import { CalendarDays, ArrowUpRight, CircleX, ArrowLeft, Store, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { appointmentLabels, calculatePayments, canChangeStatus, formatDate, statusLabels } from "../project-utils";
import { useProjects } from "../project-provider";
import type { Appointment, Project, ProjectStatus } from "../types";

export function WorkflowPanel({ project, onSave, onSchedule, onEstimate, onTeam, onMaterial, onPayment }: {
  project: Project;
  onSave: (project: Project) => Promise<boolean>;
  onSchedule: (type?: Appointment["appointment_type"]) => void;
  onEstimate: () => void;
  onTeam: () => void;
  onMaterial: () => void;
  onPayment: () => void;
}) {
  const [message, setMessage] = useState("");
  const { data } = useProjects();
  const isCustomerInspection = project.status === "site_passed";
  const suggestedTypes: Appointment["appointment_type"][] = project.status === "pending" || isCustomerInspection
    ? ["site_visit"]
    : project.status === "shop_passed" ? ["installation", "pickup"] : [];
  const scheduled = data.appointments
    .filter((appointment) => appointment.project_id === project.id && suggestedTypes.includes(appointment.appointment_type))
    .filter((appointment) => !isCustomerInspection || (appointment.status === "pending" && new Date(appointment.appointment_datetime).getTime() >= Date.now()))
    .sort((a, b) => b.appointment_datetime.localeCompare(a.appointment_datetime))[0];
  const payments = calculatePayments(project.final_cost, project.payments);
  const nextStatuses = (Object.keys(statusLabels) as ProjectStatus[])
    .filter((status) => status !== "reject" && canChangeStatus(project.status, status, payments.remaining));

  async function changeStatus(status: ProjectStatus) {
    if (!canChangeStatus(project.status, status, payments.remaining)) {
      setMessage("ยังไม่ครบเงื่อนไขเปลี่ยนสถานะ");
      return;
    }
    if (["waiting_shop_inspection", "waiting_site_inspection"].includes(status) && !project.employee_ids.length) {
      setMessage("เลือกพนักงานที่รับผิดชอบก่อนส่งตรวจ");
      return;
    }
    const saved = await onSave({ ...project, status });
    setMessage(saved ? `เปลี่ยนสถานะเป็น ${statusLabels[status]} แล้ว` : "บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน");
  }

  if (project.status === "reject") {
    return (
      <Section title="สถานะงาน" description="สรุปผลการตกลงงาน">
        <div className="mx-6 mb-4 max-w-xl overflow-hidden rounded-xl border border-rose-100 bg-rose-50/40">
          <div className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-500">
              <CircleX size={20} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-medium tracking-wide text-rose-600">ยกเลิกงานแล้ว</span>
              <h3 className="mt-0.5 text-base font-semibold text-slate-800">ลูกค้าปฏิเสธงาน</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                ลูกค้าไม่ตกลงดำเนินงาน ข้อมูลโครงการและราคาประเมินยังเก็บไว้สำหรับอ้างอิง
              </p>
            </div>
          </div>
          <div className="flex border-t border-rose-100 bg-white/60 px-4 py-2.5">
            <Link
              href="/project"
              className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-slate-600 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              กลับรายการงาน
            </Link>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title="สถานะงาน" description="อัปเดตขั้นตอนการทำงาน">
      <h3 className="pl-6 pb-2">{statusLabels[project.status]}</h3>
      {suggestedTypes.length > 0 && (
        <div key={`${project.id}-${project.status}-${scheduled?.id ?? "missing"}`} className={`schedule-reminder mx-6 mb-4 ${scheduled ? "schedule-reminder-saved" : ""}`} role="status">
          <div className="schedule-reminder-icon"><CalendarDays size={24} aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold">{scheduled ? "มีนัดหมายแล้ว" : "หัวหน้า · วางแผนนัดหมาย"}</span>
            <h4 className="mt-1 font-semibold">{scheduled
              ? `${isCustomerInspection ? "ลูกค้าเข้าตรวจรับงาน" : appointmentLabels[scheduled.appointment_type]} · ${formatDate(scheduled.appointment_datetime, true)}`
              : isCustomerInspection ? "งานหน้างานเสร็จแล้ว อย่าลืมนัดลูกค้าตรวจรับ"
              : project.status === "pending" ? "อย่าลืมนัดดูหน้างานก่อนประเมิน"
              : "งานผ่านแล้ว อย่าลืมนัดติดตั้งหรือรับที่ร้าน"}</h4>
            <p className="mt-1 text-sm">{scheduled
              ? `${scheduled.location} · ${scheduled.status === "completed" ? "ดำเนินการแล้ว" : "รอดำเนินการ"}`
              : isCustomerInspection ? "แจ้งลูกค้าว่างานเสร็จแล้ว และตกลงวันเวลาที่ลูกค้าสะดวกเข้าดูงานก่อนส่งมอบ"
              : project.status === "pending" ? "หากต้องสำรวจพื้นที่ ให้กำหนดวันเวลากับลูกค้าก่อนประเมินราคา"
              : "เลือกวิธีส่งมอบและกำหนดวันเวลากับลูกค้า เพื่อให้ทีมเตรียมงานได้ทัน"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {scheduled ? <Button type="button" variant="outline" onClick={() => onSchedule()}>ดูนัดหมาย <ArrowUpRight size={16} aria-hidden="true" /></Button>
                : suggestedTypes.map((type) => <Button key={type} type="button" variant={type === "pickup" ? "outline" : "default"} onClick={() => onSchedule(type)}>
                  {isCustomerInspection ? "นัดลูกค้าตรวจรับงาน" : type === "installation" ? "นัดติดตั้งหน้างาน" : type === "pickup" ? "นัดรับที่ร้าน" : "นัดดูหน้างาน"}<ArrowUpRight size={16} aria-hidden="true" />
                </Button>)}
            </div>
          </div>
        </div>
      )}
      {(project.status === "delivered_shop" || project.status === "delivered_site") && (
        <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
          {project.status === "delivered_shop"
            ? <Store size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            : <MapPin size={17} className="mt-0.5 shrink-0" aria-hidden="true" />}
          <p>
            รอลูกค้าตรวจรับงาน หากต้องแก้ไขจะกลับไป
            {project.status === "delivered_shop" ? "แก้ไขงานที่ร้าน" : "แก้ไขหน้างาน"}
          </p>
        </div>
      )}
      {project.status === "pending" ? (
        <p className="notice">เพิ่มรายการวัสดุและยืนยันราคาในแท็บประเมินราคาก่อน</p>
      ) : (
        <div className="flex flex-wrap gap-1 ml-6">
          {nextStatuses.map((status) => (
            <Button key={status} className="mb-2" variant={status.startsWith("revision") ? "outline" : "default"}
              onClick={() => void changeStatus(status)}>
              {status === "delivered_shop" && <Store size={16} aria-hidden="true" />}
              {status === "delivered_site" && <MapPin size={16} aria-hidden="true" />}
              {status === "delivered_shop" ? "ส่งมอบงานที่ร้าน"
                : status === "delivered_site" ? "ส่งมอบงานหน้างาน"
                : status === "completed" ? "ยืนยันปิด Project"
                : statusLabels[status]}
            </Button>
          ))}
          {nextStatuses.includes("waiting_shop_inspection") && (
            <>
              <Button className="mb-2" variant="outline" onClick={onTeam}>เพิ่มสมาชิก</Button>
              <Button className="mb-2" variant="outline" onClick={onMaterial}>วัสดุที่ใช้</Button>
            </>
          )}
          {project.status === "estimated" && (
            <Button className="mb-2 hover:bg-[#F26E50] bg-[#D95032] text-white hover:text-white" variant="outline" onClick={onEstimate}>ประเมินราคาใหม่</Button>
          )}
        </div>
      )}
      {project.status === "accepted" && payments.remaining > 0 && (
        <div className="notice flex flex-wrap items-center justify-between gap-3">
          <p>รับเงินให้ครบก่อนปิดงาน</p>
          <Button type="button" onClick={onPayment}>
            ไปการเงิน <ArrowUpRight size={16} aria-hidden="true" />
          </Button>
        </div>
      )}
      {!["completed", "reject"].includes(project.status) &&
        <div className="mx-6 mt-3 mb-4 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onSchedule()}
            className="group inline-flex items-center gap-2 rounded-sm py-1 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 disabled:opacity-50"
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span className="group-hover:underline underline-offset-4">จัดการนัดหมาย</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        </div>
      }
      {message && <p role="status" className="text-blue pl-6 pb-1">{message}</p>}
    </Section>
  );
}
