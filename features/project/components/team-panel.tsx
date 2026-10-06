"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { useProjects } from "../project-provider";
import type { Project } from "../types";

export function TeamPanel({
  project,
  onSave,
}: {
  project: Project;
  onSave: (project: Project) => Promise<boolean>;
}) {
  const { data } = useProjects();
  const [selected, setSelected] = useState(project.employee_ids);
  const [message, setMessage] = useState("");
  const canAssign = !["pending", "estimated", "completed"].includes(project.status);
  return (
    <Section
      title="เลือกทีมที่รับผิดชอบ"
      description="มอบหมายพนักงานได้หลายคนสำหรับงานที่ร้านและงานติดตั้ง"
    >
      <div className="team-options">
        {data.employees.map((employee) => (
          <label
            key={employee.id}
            className={`team-option ${selected.includes(employee.id) ? "selected" : ""}`}
          >
            <input
              type="checkbox"
              disabled={!canAssign}
              checked={selected.includes(employee.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, employee.id]
                    : selected.filter((id) => id !== employee.id),
                )
              }
            />
            <span>
              <strong>{employee.employee_name}</strong>
              <small>
                {employee.role} · {employee.phone_number}
              </small>
            </span>
          </label>
        ))}
      </div>
      <div className="form-actions">
        <p role="status" className="text-blue text-sm">
          {message || (!canAssign ? "มอบหมายได้เมื่อลูกค้าตกลงงานแล้ว" : "")}
        </p>
        {canAssign && (
          <Button
            disabled={!selected.length}
            onClick={async () => {
              const saved = await onSave({
                ...project,
                employee_ids: selected,
              });
              if (!saved) { setMessage("บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน"); return; }
              setMessage("บันทึกทีมงานแล้ว");
            }}
          >
            ยืนยันการมอบหมาย
          </Button>
        )}
      </div>
    </Section>
  );
}
