"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Section, EmptyState } from "@/features/shared/ui";
import { money } from "../project-utils";
import type { Project } from "../types";

export function MaterialPanel({
  project,
  onSave,
}: {
  project: Project;
  onSave: (project: Project) => void;
}) {
  const [quantities, setQuantities] = useState(project.materials.map((m) => m.quantity));
  const [message, setMessage] = useState("");
  const canRecordUsage = ["confirmed", "revision", "shop_passed"].includes(project.status);

  function saveUsage(event: FormEvent) {
    event.preventDefault();
    onSave({
      ...project,
      materials: project.materials.map((m, index) => ({ ...m, quantity: quantities[index] })),
      history: [
        ...project.history,
        { date: new Date().toISOString(), text: "บันทึกจำนวนวัสดุใช้จริง" },
      ],
    });
    setMessage("บันทึกจำนวนใช้จริงแล้ว ราคาที่ตกลงไว้คงเดิม");
  }

  return (
    <>
      <Section
        title="รายการจัดซื้อ"
        description="ซื้อวัสดุตามจำนวนในใบเสนอราคา ไม่มีการเชื่อมคลัง Stock"
      >
        {!project.quotation ? (
          <EmptyState
            title="ยังไม่มีรายการจัดซื้อ"
            description="ยืนยันการประเมินราคาก่อนเริ่มซื้อวัสดุ"
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>วัสดุ</th>
                    <th>จำนวนที่ต้องซื้อ</th>
                    <th>ราคา/หน่วย</th>
                    <th>ต้นทุนประมาณการ</th>
                    <th>ใช้สำหรับ</th>
                  </tr>
                </thead>
                <tbody>
                  {project.quotation.materials.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.material_name}</strong>
                      </td>
                      <td>
                        {m.quantity} {m.unit}
                      </td>
                      <td>฿{money(m.unit_cost)}</td>
                      <td>฿{money(m.quantity * m.unit_cost)}</td>
                      <td>{m.use_for || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="page-note">
              ตาม Use Case ล่าสุด ไม่มีข้อมูลจำนวนซื้อจริงหรือจำนวนยังขาด
              หากซื้อไม่ครบให้ซื้อส่วนที่เหลือภายหลัง
            </p>
            {!["pending", "estimated", "completed"].includes(project.status) && (
              <div className="form-actions">
                <p className="text-sm text-blue" role="status">{message}</p>
                <Button
                  onClick={() => {
                    onSave({
                      ...project,
                      history: [
                        ...project.history,
                        { date: new Date().toISOString(), text: "ยืนยันการซื้อวัสดุตามรายการ" },
                      ],
                    });
                    setMessage("ยืนยันการซื้อตามรายการแล้ว");
                  }}
                >
                  ยืนยันการซื้อวัสดุตามรายการ
                </Button>
              </div>
            )}
          </>
        )}
      </Section>
      {project.materials.length > 0 && (
        <Section
          title="วัสดุใช้จริง"
          description="บันทึกจำนวนที่ใช้เมื่อลงมือทำงาน แยกจากใบเสนอราคาที่ยืนยันแล้ว"
        >
          <form onSubmit={saveUsage}>
            <div className="usage-grid">
              {project.materials.map((m, index) => (
                <label key={m.id}>
                  {m.material_name}
                  <div className="input-with-unit">
                    <input
                      aria-label={`ใช้จริง ${m.material_name}`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      disabled={!canRecordUsage}
                      value={quantities[index]}
                      onChange={(e) =>
                        setQuantities(
                          quantities.map((value, i) =>
                            i === index ? Number(e.target.value) : value,
                          ),
                        )
                      }
                    />
                    <span>{m.unit}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="form-actions">
              <p role="status" className="text-blue text-sm">
                {message}
              </p>
              {canRecordUsage && <Button type="submit">บันทึกจำนวนใช้จริง</Button>}
            </div>
          </form>
        </Section>
      )}
    </>
  );
}
