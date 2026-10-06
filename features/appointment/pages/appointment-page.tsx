"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, MapPin, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, PageHeading, Section } from "@/features/shared/ui";
import { useProjects } from "@/features/project/project-provider";
import { appointmentLabels, formatDate } from "@/features/project/project-utils";

export function AppointmentPage() {
  const { data, ready, saving, saveAppointment } = useProjects();
  const [filter, setFilter] = useState("all");
  if (!ready) return <LoadingState />;
  const appointments = data.appointments
    .filter((a) => filter === "all" || a.appointment_type === filter)
    .sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime));
  return (
    <>
      <PageHeading
        eyebrow="SCHEDULE"
        title="นัดหมาย"
        description="วางแผนดูหน้างานและรับสินค้าที่ร้าน"
      />
      <Section title="รายการนัดหมาย" description="เพิ่มหรือแก้ไขนัดหมายจากหน้ารายละเอียดงาน">
        <div className="filter-tabs">
          {[["all", "ทั้งหมด"], ...Object.entries(appointmentLabels)].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? "selected" : ""}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {!appointments.length ? (
          <EmptyState
            title="ยังไม่มีนัดหมายประเภทนี้"
            description="เปิดงานที่ต้องการแล้วกำหนดวันเวลาในแท็บนัดหมาย"
          />
        ) : (
          <div className="schedule-list">
            {appointments.map((a) => {
              const p = data.projects.find((p) => p.id === a.project_id);
              return (
                <div className="schedule-card" key={a.id}>
                  <span className="schedule-icon">
                    <CalendarDays size={25} />
                  </span>
                  <div className="schedule-info">
                    <span className={`badge badge-${a.status === "completed" ? "green" : "blue"}`}>
                      {appointmentLabels[a.appointment_type]} ·{" "}
                      {a.status === "completed" ? "ดำเนินการแล้ว" : "รอดำเนินการ"}
                    </span>
                    <h3>{p?.order_name ?? a.project_id}</h3>
                    <p>{formatDate(a.appointment_datetime, true)}</p>
                    <small>
                      <MapPin size={14} />
                      {a.location}
                    </small>
                  </div>
                  <div className="schedule-actions">
                    <Link href={`/project/${a.project_id}`} className="text-link">
                      เปิดงาน <ArrowUpRight size={16} />
                    </Link>
                    {a.status === "pending" && (
                      <Button
                        disabled={saving}
                        variant="outline"
                        onClick={() => saveAppointment({ ...a, status: "completed" })}
                      >
                        ดำเนินการแล้ว
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
      <p className="page-note">การแจ้งเตือน LINE ยังไม่เปิดใช้งานในเวอร์ชัน frontend</p>
    </>
  );
}
