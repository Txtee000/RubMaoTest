"use client";

import Link from "next/link";

import {
  ArrowRight,
  ArrowUpRight,
  FolderKanban,
  ClipboardList,
  CheckCircle2,
  Wallet,
  CalendarDays,
  Clock3,
  Sparkles,
} from "lucide-react";
import { PageHeading, Section, LoadingState } from "@/features/shared/ui";
import { useProjects } from "@/features/project/project-provider";
import {
  appointmentLabels,
  calculatePayments,
  formatDate,
  money,
  projectPrice,
  statusLabels,
} from "@/features/project/project-utils";
import { ProjectTable } from "@/features/project/components/project-table";
import { useEffect } from "react";

export function DashboardPage() {
  const { data, ready } = useProjects();

  if (!ready) return <LoadingState />;
  const active = data.projects.filter((p) => p.status !== "completed");
  const awaiting = data.projects.filter((p) => p.status === "pending" || p.status === "estimated");
  const due = data.projects
    .filter((p) => p.status !== "pending")
    .reduce(
      (sum, p) => sum + calculatePayments(projectPrice(p).final_cost, p.payments).remaining,
      0,
    );
  const appointments = data.appointments
    .filter((a) => a.status === "pending")
    .sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime))
    .slice(0, 3);
  const stats = [
    {
      label: "งานที่กำลังดำเนินการ",
      value: String(active.length).padStart(2, "0"),
      note: "ติดตามทุกขั้นตอนในที่เดียว",
      icon: FolderKanban,
      color: "blue",
    },
    {
      label: "รอประเมิน / รอตกลง",
      value: String(awaiting.length).padStart(2, "0"),
      note: "งานที่ต้องดำเนินการต่อ",
      icon: ClipboardList,
      color: "amber",
    },
    {
      label: "งานที่ปิดแล้ว",
      value: String(data.projects.filter((p) => p.status === "completed").length).padStart(2, "0"),
      note: "ส่งมอบและรับเงินครบแล้ว",
      icon: CheckCircle2,
      color: "green",
    },
    {
      label: "ยอดคงเหลือตามใบเสนอราคา",
      value: `฿${money(due)}`,
      note: "รวมงานที่ยังรอลูกค้าตกลง",
      icon: Wallet,
      color: "violet",
    },
  ];

  
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE OVERVIEW"
        title="ภาพรวมงานของร้าน"
        description="พร้อมเริ่มวันใหม่ ดูแลทุกงานให้เดินหน้าต่อ"
        action={
          <Link className="button-link" href="/project">
            ดูรายการงาน <ArrowUpRight size={17} />
          </Link>
        }
      />
      
      <div className="stats-grid">
        {stats.map((item) => (
          <div className="stat-card" key={item.label}>
            <div className="stat-top">
              <p>{item.label}</p>
              <span className={`stat-icon stat-${item.color}`}>
                <item.icon size={20} />
              </span>
            </div>
            <strong className={item.color === "violet" ? "stat-money" : ""}>{item.value}</strong>
            <small>{item.note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <Section
          title="งานล่าสุด"
          description="ติดตามงานและสิ่งที่ต้องทำต่อ"
          action={
            <Link className="text-link" href="/project">
              ดูทั้งหมด <ArrowRight size={15} />
            </Link>
          }
        >
          <ProjectTable projects={data.projects.slice(0, 5)} />
        </Section>
        <div className="dashboard-side">
          <Section
            title="นัดหมายที่รอดำเนินการ"
            action={<CalendarDays size={19} className="text-blue" />}
          >
            <div className="appointment-preview">
              {appointments.length ? (
                appointments.map((a) => {
                  const p = data.projects.find((p) => p.id === a.project_id);
                  return (
                    <Link
                      href={`/project/${a.project_id}`}
                      key={a.id}
                      className="appointment-preview-item"
                    >
                      <div className="calendar-tile">
                        <CalendarDays size={21} />
                      </div>
                      <div>
                        <span className="eyebrow">{appointmentLabels[a.appointment_type]}</span>
                        <strong>{p?.order_name}</strong>
                        <small>
                          <Clock3 size={12} />
                          {formatDate(a.appointment_datetime, true)}
                        </small>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="text-muted">ยังไม่มีนัดหมาย</p>
              )}
              <Link href="/appointments" className="all-appointments">
                เปิดหน้านัดหมาย <ArrowRight size={15} />
              </Link>
            </div>
          </Section>
          <Section title="สิ่งที่ต้องทำต่อ">
            <div className="todo-list">
              {data.projects
                .filter((p) =>
                  ["pending", "waiting_shop_inspection", "shop_passed"].includes(p.status),
                )
                .slice(0, 3)
                .map((p) => (
                  <Link href={`/project/${p.id}`} key={p.id} className="hover:-translate-y-1 hover:bg-gray-100 hover:rounded-[2px] duration-200 ">
                    <span className="todo-dot ml-2" />
                    <div>
                      <div>{p.order_name}</div>
                      <div className="text-[11px]">{statusLabels[p.status]}</div>
                    </div>
                    <ArrowUpRight size={16} className="mr-2"/>
                  </Link>
                ))}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
