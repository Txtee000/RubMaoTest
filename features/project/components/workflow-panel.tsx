"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { calculatePayments, canChangeStatus, statusLabels } from "../project-utils";
import type { Project, ProjectStatus } from "../types";

export function WorkflowPanel({ project, onSave, onSchedule }: {
  project: Project;
  onSave: (project: Project) => Promise<boolean>;
  onSchedule: () => void;
}) {
  const [message, setMessage] = useState("");
  const payments = calculatePayments(project.final_cost, project.payments);
  const nextStatuses = (Object.keys(statusLabels) as ProjectStatus[])
    .filter((status) => canChangeStatus(project.status, status, payments.remaining));

  async function changeStatus(status: ProjectStatus) {
    if (!canChangeStatus(project.status, status, payments.remaining)) {
      setMessage("ยังไม่ครบเงื่อนไขเปลี่ยนสถานะ");
      return;
    }
    if (["waiting_shop_inspection", "waiting_site_inspection"].includes(status) && !project.employee_ids.length) {
      setMessage("เลือกทีมที่รับผิดชอบก่อนส่งตรวจ");
      return;
    }
    const saved = await onSave({ ...project, status });
    setMessage(saved ? `เปลี่ยนสถานะเป็น ${statusLabels[status]} แล้ว` : "บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน");
  }

  return (
    <Section title="สถานะงาน" description="อัปเดตขั้นตอนการทำงาน">
      <h3 className="pl-6 pb-2">{statusLabels[project.status]}</h3>
      {project.status === "pending" ? (
        <p className="notice">เพิ่มรายการวัสดุและยืนยันราคาในแท็บประเมินราคาก่อน</p>
      ) : (
        <div className="button-row">
          {nextStatuses.map((status) => (
            <Button key={status} className="ml-5 mb-2" variant={status === "revision" ? "outline" : "default"}
              onClick={() => void changeStatus(status)}>{statusLabels[status]}</Button>
          ))}
        </div>
      )}
      {project.status === "accepted" && payments.remaining > 0 &&
        <p className="notice">รับเงินให้ครบก่อนปิดงาน</p>}
      {project.status !== "completed" && 
        <Button className="ml-6 mb-4" variant="outline" onClick={onSchedule}>จัดการนัดหมาย</Button>
      }
      {message && <p role="status" className="text-blue">{message}</p>}
    </Section>
  );
}
