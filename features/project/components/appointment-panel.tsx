"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { appointmentLabels, formatDate } from "../project-utils";
import { useProjects } from "../project-provider";
import type { Appointment, Project } from "../types";

export function AppointmentPanel({ project, initialType = "site_visit" }: { project: Project; initialType?: Appointment["appointment_type"] }) {
  const { data, saveAppointment } = useProjects();
  const appointments = data.appointments.filter((a) => a.project_id === project.id);
  const [editingId, setEditingId] = useState(0);
  const [type, setType] = useState<Appointment["appointment_type"]>(initialType);
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("00");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  async function completeAppointment(appointment: Appointment) {
    const saved = await saveAppointment({ ...appointment, status: "completed" });
    if (!saved) { setMessage("บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน"); return; }
    // ปิดฟอร์มของนัดที่เสร็จแล้ว เพื่อไม่ให้บันทึกกลับเป็นรอดำเนินการ
    if (editingId === appointment.id) {
      setEditingId(0);
      setDate("");
      setHour("");
      setMinute("00");
      setLocation("");
      setType("site_visit");
    }
    setMessage("อัปเดตนัดหมายเป็นดำเนินการแล้ว");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!location.trim()) {
      setMessage("กรอกสถานที่นัดหมายก่อนบันทึก");
      return;
    }
    const saved = await saveAppointment({
      id: editingId, // 0 หมายถึงนัดใหม่; ฐานข้อมูลสร้าง ID ตอน POST
      project_id: project.id,
      appointment_type: type,
      appointment_datetime: `${date}T${hour}:${minute}:00+07:00`,
      location: location.trim(),
      status: "pending",
    });
    if (!saved) { setMessage("บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน"); return; }
    setEditingId(0);
    setDate("");
    setHour("");
    setMinute("00");
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
                <p className="text-muted whitespace-pre-wrap break-words">{a.location}</p>
                <small>{a.status === "completed" ? "ดำเนินการแล้ว" : "รอดำเนินการ"}</small>
                {a.status === "pending" && !["completed", "reject"].includes(project.status) && (
                  <div className="button-row ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(a.id);
                      setType(a.appointment_type);
                      const parts = new Intl.DateTimeFormat("en-CA", {
                        timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
                      }).formatToParts(new Date(a.appointment_datetime));
                      const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
                      setDate(`${part("year")}-${part("month")}-${part("day")}`);
                      setHour(part("hour"));
                      setMinute(part("minute"));
                      setLocation(a.location);
                      setMessage("");
                    }}
                  >
                    แก้ไขนัด
                  </Button>
                  <Button type="button" onClick={() => completeAppointment(a)}>
                    ดำเนินการแล้ว
                  </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted">ยังไม่มีนัดหมายสำหรับงานนี้</p>
          )}
        </div>
      </Section>
      {!["completed", "reject"].includes(project.status) && (
        <Section
          title={editingId ? "แก้ไขนัดหมาย" : "เพิ่มนัดหมาย"}
          description="หัวหน้าเลือกประเภทนัด วันเวลา และสถานที่ได้เอง"
        >
          <form
            onSubmit={save}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
                event.preventDefault();
              }
            }}
          >
            <div className="form-grid">
              <label>
                ประเภทนัด
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Appointment["appointment_type"])}
                >
                  {Object.entries(appointmentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                วันที่นัดหมาย
                <span className="appointment-date-field">
                  {/* ใช้ปฏิทินเดิม แต่แสดงวัน/เดือน/ปีให้ตรงกันทุกเครื่อง */}
                  <span aria-hidden="true">
                    {date ? date.split("-").reverse().join("/") : "วว/ดด/ปปปป"}
                  </span>
                  <CalendarDays size={17} aria-hidden="true" />
                  <input
                    type="date"
                    aria-label="วันที่นัดหมาย"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.();
                      } catch {
                        // เบราว์เซอร์ที่ไม่รองรับจะใช้ตัวเลือกวันที่ตามปกติ
                      }
                    }}
                  />
                </span>
              </label>
              <div>
                <span className="text-sm text-muted">เวลา</span>
                <div className="button-row mt-2">
                  <select
                    aria-label="ชั่วโมงนัดหมาย"
                    required
                    value={hour}
                    onChange={(e) => setHour(e.target.value)}
                  >
                    <option value="" disabled>ชั่วโมง</option>
                    {Array.from({ length: 24 }, (_, value) => {
                      const text = String(value).padStart(2, "0");
                      return <option key={text} value={text}>{text}</option>;
                    })}
                  </select>
                  <span aria-hidden="true">:</span>
                  <select
                    aria-label="นาทีนัดหมาย"
                    required
                    value={minute}
                    onChange={(e) => setMinute(e.target.value)}
                  >
                    {Array.from({ length: 60 }, (_, value) => {
                      const text = String(value).padStart(2, "0");
                      return <option key={text} value={text}>{text}</option>;
                    })}
                  </select>
                </div>
              </div>
              <label className="full-width">
                สถานที่
                <textarea
                  required
                  rows={3}
                  maxLength={10000}
                  aria-describedby="appointment-location-hint"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                    }
                  }}
                  placeholder="ที่อยู่หน้างาน หรือชื่อร้าน"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <span id="appointment-location-hint" className="text-muted">กด Shift+Enter เพื่อขึ้นบรรทัดใหม่</span>
              </label>
            </div>
            <div className="form-actions">
              <p role="status" className="text-sm text-blue">
                {message}
              </p>
              <div className="button-row">
                {editingId > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(0);
                      setDate("");
                      setHour("");
                      setMinute("00");
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
