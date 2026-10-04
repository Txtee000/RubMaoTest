"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { useProjects } from "../project-provider";
import { calculatePayments, canChangeStatus, projectPrice, statusLabels } from "../project-utils";
import type { Project, ProjectStatus } from "../types";

export function WorkflowPanel({
  project,
  onSave,
  onSchedule,
}: {
  project: Project;
  onSave: (project: Project) => void;
  onSchedule: () => void;
}) {
  const { data } = useProjects();
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const payments = calculatePayments(projectPrice(project).final_cost, project.payments);
  const hasAppointment = data.appointments.some(
    (a) => a.project_id === project.id && a.appointment_type === project.delivery_type,
  );

  function changeStatus(next: ProjectStatus) {
    if (!canChangeStatus(project.status, next, project.delivery_type, payments.remaining)) {
      setMessage("ยังไม่ครบเงื่อนไขของขั้นตอนนี้");
      return;
    }
    if (
      ["waiting_shop_inspection", "waiting_site_inspection"].includes(next) &&
      !project.employee_ids.length
    ) {
      setMessage("เลือกทีมที่รับผิดชอบในแท็บทีมงานก่อนส่งตรวจ");
      return;
    }
    if (project.status === "shop_passed" && !hasAppointment) {
      setMessage("กำหนดนัดรับสินค้าหรือติดตั้งก่อนดำเนินการต่อ");
      return;
    }
    if (next === "revision" && !note.trim()) {
      setMessage("กรอกรายละเอียดที่ต้องแก้ไขก่อน");
      return;
    }
    const revision_stage =
      next === "revision"
        ? project.status === "waiting_site_inspection" ||
          (project.delivery_type === "installation" && project.status === "delivered")
          ? "site"
          : "shop"
        : project.revision_stage;
    onSave({
      ...project,
      status: next,
      revision_stage,
      history: [
        ...project.history,
        {
          date: new Date().toISOString(),
          text: `${statusLabels[next]}${note.trim() ? ` · ${note.trim()}` : ""}`,
        },
      ],
    });
    setNote("");
    setMessage(`เปลี่ยนสถานะเป็น ${statusLabels[next]} แล้ว`);
  }

  return (
    <Section title="ขั้นตอนถัดไป" description="ดำเนินงานตาม Use Case และบันทึกผลตรวจในแต่ละขั้น">
      <div className="workflow-current">
        <span className="workflow-icon">
          <CheckCircle2 size={25} />
        </span>
        <div>
          <small>สถานะปัจจุบัน</small>
          <h3>{statusLabels[project.status]}</h3>
        </div>
      </div>
      {project.status === "pending" && (
        <p className="notice">
          พิจารณานัดดูหน้างาน แล้วเปิดแท็บประเมินราคาเพื่อเพิ่มรายการวัสดุและยืนยันราคา
        </p>
      )}
      {project.status === "estimated" && (
        <div className="workflow-action">
          <p>แชร์ใบเสนอราคาให้ลูกค้าพิจารณา เมื่อได้รับคำตอบว่าตกลงแล้วจึงยืนยันขั้นตอนนี้</p>
          <Button onClick={() => changeStatus("confirmed")}>
            <CheckCircle2 size={16} />
            ลูกค้าตกลงงานแล้ว
          </Button>
        </div>
      )}
      {project.status === "confirmed" && (
        <div className="workflow-action">
          <p>ตรวจรายการจัดซื้อ มอบหมายทีม และทำงานที่ร้าน เมื่อเสร็จแล้วส่งให้หัวหน้าตรวจ</p>
          <Button onClick={() => changeStatus("waiting_shop_inspection")}>
            งานที่ร้านเสร็จ / ส่งตรวจ <ArrowRight size={16} />
          </Button>
        </div>
      )}
      {["waiting_shop_inspection", "waiting_site_inspection", "delivered"].includes(
        project.status,
      ) && (
        <div className="workflow-action">
          <p>
            {project.status === "delivered"
              ? "บันทึกผลการตรวจรับจากลูกค้า"
              : "ตรวจคุณภาพงานจริง แล้วบันทึกผลผ่านหรือขอแก้ไข"}
          </p>
          <label>
            รายละเอียดผลตรวจ / จุดที่ต้องแก้ไข
            <textarea
              placeholder="กรอกสิ่งที่ต้องแก้ไขหากตรวจไม่ผ่าน"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="button-row">
            <Button
              onClick={() =>
                changeStatus(
                  project.status === "waiting_shop_inspection"
                    ? "shop_passed"
                    : project.status === "waiting_site_inspection"
                      ? "site_passed"
                      : "accepted",
                )
              }
            >
              <CheckCircle2 size={16} />
              {project.status === "delivered" ? "ลูกค้าตรวจรับผ่าน" : "ตรวจผ่าน"}
            </Button>
            <Button variant="destructive" onClick={() => changeStatus("revision")}>
              <RotateCcw size={16} />
              ต้องแก้ไข
            </Button>
          </div>
        </div>
      )}
      {project.status === "revision" && (
        <div className="workflow-action">
          <p>
            แก้ไขตามผลตรวจล่าสุด แล้วส่งกลับมาตรวจอีกครั้งที่
            {project.revision_stage === "site" ? "หน้างาน" : "ร้าน"}
          </p>
          <Button
            onClick={() =>
              changeStatus(
                project.revision_stage === "site"
                  ? "waiting_site_inspection"
                  : "waiting_shop_inspection",
              )
            }
          >
            แก้ไขเสร็จ / ส่งตรวจใหม่
          </Button>
        </div>
      )}
      {project.status === "shop_passed" && (
        <div className="workflow-action">
          <p>งานที่ร้านตรวจผ่านแล้ว เลือกวิธีรับงาน จากนั้นกำหนดวันเวลา</p>
          <div className="delivery-options">
            {[
              { value: "pickup", label: "รับที่ร้าน" },
              { value: "installation", label: "ติดตั้งหน้างาน" },
            ].map(({ value, label }) => (
              <label key={value} className={project.delivery_type === value ? "selected" : ""}>
                <input
                  type="radio"
                  name="delivery"
                  checked={project.delivery_type === value}
                  onChange={() => {
                    if (
                      project.delivery_type !== value &&
                      data.appointments.some(
                        (a) => a.project_id === project.id && a.appointment_type !== "site_visit",
                      )
                    ) {
                      setMessage("มีนัดหมายรับงานแล้ว กรุณาใช้วิธีเดิมเพื่อให้ข้อมูลนัดหมายตรงกัน");
                      return;
                    }
                    onSave({ ...project, delivery_type: value as Project["delivery_type"] });
                    setMessage("");
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          {project.delivery_type && (
            <div className="button-row">
              <Button variant="outline" onClick={onSchedule}>
                กำหนดวันเวลา
              </Button>
              <Button
                disabled={!hasAppointment}
                onClick={() =>
                  changeStatus(
                    project.delivery_type === "pickup" ? "delivered" : "waiting_site_inspection",
                  )
                }
              >
                {project.delivery_type === "pickup"
                  ? "ลูกค้ามารับ / ยืนยันส่งมอบ"
                  : "ติดตั้งเสร็จ / ส่งตรวจหน้างาน"}
              </Button>
            </div>
          )}
          {project.delivery_type && !hasAppointment && (
            <small className="text-muted">ต้องมีนัดหมายก่อนยืนยันส่งมอบหรือส่งตรวจติดตั้ง</small>
          )}
        </div>
      )}
      {project.status === "site_passed" && (
        <div className="workflow-action">
          <p>งานติดตั้งตรวจผ่านแล้ว พร้อมส่งมอบให้ลูกค้า</p>
          <Button onClick={() => changeStatus("delivered")}>ยืนยันส่งมอบงาน</Button>
        </div>
      )}
      {project.status === "accepted" && (
        <div className="workflow-action">
          <p>
            {payments.remaining > 0
              ? "ลูกค้าตรวจรับแล้ว กรุณารับเงินส่วนที่เหลือในแท็บการเงินก่อนปิดงาน"
              : "ลูกค้าตรวจรับและรับเงินครบแล้ว พร้อมปิดงาน"}
          </p>
          <Button disabled={payments.remaining > 0} onClick={() => changeStatus("completed")}>
            <CheckCircle2 size={16} />
            ยืนยันปิดงาน
          </Button>
        </div>
      )}
      {project.status === "completed" && (
        <p className="notice notice-green">งานเสร็จสมบูรณ์ ส่งมอบและรับเงินครบแล้ว</p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </Section>
  );
}
