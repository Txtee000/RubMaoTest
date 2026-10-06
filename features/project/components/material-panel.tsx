"use client";

import { Section, EmptyState } from "@/features/shared/ui";
import { money } from "../project-utils";
import type { Project } from "../types";

export function MaterialPanel({ project }: { project: Project }) {
  return (
    <Section title="วัสดุของงาน" description="รายการวัสดุ จำนวน และราคาต่อหน่วยที่บันทึกไว้">
      {!project.materials.length ? (
        <EmptyState title="ยังไม่มีรายการวัสดุ" description="เพิ่มรายการจากแท็บประเมินราคา" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>วัสดุ</th><th>ใช้สำหรับ</th><th>จำนวน</th><th>หน่วย</th><th>ราคาต่อหน่วย</th><th>รวม</th></tr></thead>
            <tbody>
              {project.materials.map((material) => (
                <tr key={material.id}>
                  <td>{material.material_name}</td><td>{material.use_for || "—"}</td>
                  <td>{material.quantity}</td><td>{material.unit}</td>
                  <td>฿{money(material.unit_cost)}</td><td>฿{money(material.quantity * material.unit_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
