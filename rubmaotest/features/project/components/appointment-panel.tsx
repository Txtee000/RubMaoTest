"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { appointmentLabels, formatDate } from "../project-utils";
import { useProjects } from "../project-provider";
import type { Appointment, Project } from "../types";

function localDateTime(value: string) {
  return value.slice(0, 16);
}

export function AppointmentPanel({ project }: { project: Project }) {
  const { data, saveAppointment } = useProjects();
  const appointments = data.appointments.filter((a) => a.project_id === project.id);
  const [editingId, setEditingId] = useState("");
  const [type, setType] = useState<Appointment["appointment_type"]>("site_visit");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const canScheduleDelivery = project.status === "shop_passed" && !!project.delivery_type;

  function save(event: FormEvent) {
    event.preventDefault();
    if (!location.trim()) {
      setMessage("กรอกสถานที่นัดหมายก่อนบันทึก");
      return;
    }
    if (type !== "site_visit" && !canScheduleDelivery && !editingId) {
      setMessage("เลือกวิธีรับงานหลังงานที่ร้านตรวจผ่านก่อน");
      return;
    }
    saveAppointment({
      id: editingId || crypto.randomUUID(),
      project_id: project.id,
      appointment_type: type,
      appointment_datetime: `${date}:00+07:00`,
      location: location.trim(),
      status: "pending",
    });
    setEditingId("");
    setDate("");
    setLocation("");
    setMessage("บันทึกนัดหมายแล้ว");
  }

  return (
    <>
      <Section title="นัดหมายของงาน" description="กำหนดวันเวลาในเขตเวลาประเทศไทย">
        <div className="project-appointments">
          {appointments.length ? (
            appointments.map((a) => (
              <div key={a.id}>
                <span className={`badge badge-${a.status === "completed" ? "green" : "blue"}`}>
                  {appointmentLabels[a.appointment_type]}
                </span>
                <strong>{formatDate(a.appointment_datetime, true)}</strong>
                <p className="text-muted">{a.location}</p>
                <small>{a.status === "completed" ? "ดำเนินการแล้ว" : "รอดำเนินการ"}</small>
                {a.status === "pending" && project.status !== "completed" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(a.id);
                      setType(a.appointment_type);
                      setDate(localDateTime(a.appointment_datetime));
                      setLocation(a.location);
                      setMessage("");
                    }}
                  >
                    แก้ไขนัด
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted">ยังไม่มีนัดหมายสำหรับงานนี้</p>
          )}
        </div>
      </Section>
      {project.status !== "completed" && (
        <Section
          title={editingId ? "แก้ไขนัดหมาย" : "เพิ่มนัดหมาย"}
          description="ดูหน้างานนัดได้ก่อนประเมิน ส่วนรับสินค้า/ติดตั้งเลือกได้หลังตรวจที่ร้านผ่าน"
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <label>
                ประเภทนัด
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Appointment["appointment_type"])}
                  disabled={!!editingId}
                >
                  <option value="site_visit">ดูหน้างาน</option>
                  {(canScheduleDelivery || type !== "site_visit") && (
                    <option value={project.delivery_type ?? type}>
                      {appointmentLabels[project.delivery_type ?? type]}
                    </option>
                  )}
                </select>
              </label>
              <label>
                วันและเวลา
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="full-width">
                สถานที่
                <input
                  required
                  placeholder="ที่อยู่หน้างาน หรือชื่อร้าน"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>
            </div>
            <div className="form-actions">
              <p role="status" className="text-sm text-blue">
                {message}
              </p>
              <div className="button-row">
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId("");
                      setDate("");
                      setLocation("");
                      setType("site_visit");
                    }}
                  >
                    ยกเลิกการแก้ไข
                  </Button>
                )}
                <Button type="submit">บันทึกนัดหมาย</Button>
              </div>
            </div>
          </form>
        </Section>
      )}
      <p className="page-note">ยังไม่ส่งแจ้งเตือนผ่าน LINE OA ในเวอร์ชันนี้</p>
    </>
  );
}
