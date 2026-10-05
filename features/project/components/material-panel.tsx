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
  const [acquiredQuantities, setAcquiredQuantities] = useState<Record<string, string>>(
    Object.fromEntries(project.materials.map((m) => [m.id, String(m.acquired_quantity ?? 0)])),
  );
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const canUpdatePurchases = !["pending", "estimated", "completed"].includes(project.status);
  const quotationMaterials = project.quotation?.materials ?? [];
  const plannedMaterials = [
    ...quotationMaterials,
    ...project.materials.filter((m) => !quotationMaterials.some((quoted) => quoted.id === m.id)),
  ];
  const completeCount = plannedMaterials.filter(
    (m) => Number(acquiredQuantities[m.id] ?? 0) >= m.quantity,
  ).length;

  function savePurchases(event: FormEvent) {
    event.preventDefault();
    const invalidQuantity = plannedMaterials.some((m) => {
      const value = acquiredQuantities[m.id];
      return (
        value === undefined ||
        value.trim() === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      );
    });
    if (invalidQuantity) {
      setPurchaseMessage("กรอกยอดที่ได้มาแล้วให้ครบ และต้องไม่น้อยกว่า 0");
      return;
    }

    // กรอกยอดสะสม เช่น มี 4 แล้วได้เพิ่มอีก 3 ให้กรอก 7
    const summary = plannedMaterials
      .map((m) => `${m.material_name} ${Number(acquiredQuantities[m.id])}/${m.quantity} ${m.unit}`)
      .join(", ");
    onSave({
      ...project,
      materials: project.materials.map((m) => ({
        ...m,
        acquired_quantity: Number(acquiredQuantities[m.id] ?? m.acquired_quantity ?? 0),
      })),
      history: [
        ...project.history,
        { date: new Date().toISOString(), text: `อัปเดตยอดวัสดุที่ได้มาแล้ว · ${summary}` },
      ],
    });
    setPurchaseMessage("บันทึกยอดที่ได้มาแล้ว คำนวณจำนวนที่ต้องซื้อเพิ่มเรียบร้อย");
  }

  return (
    <>
      <Section
        title="รายการจัดซื้อ"
        description="อัปเดตยอดที่ได้มาแล้ว เทียบกับจำนวนที่วางไว้ในใบเสนอราคา"
      >
        {!project.quotation ? (
          <EmptyState
            title="ยังไม่มีรายการจัดซื้อ"
            description="ยืนยันการประเมินราคาก่อนเริ่มซื้อวัสดุ"
          />
        ) : (
          <form onSubmit={savePurchases}>
            <p className="notice">
              วัสดุครบ {completeCount} จาก {plannedMaterials.length} รายการ ·
              กรอกยอดสะสมทั้งหมด หรือใช้แบบฟอร์มซื้อเพิ่มด้านล่างเพื่อบวกจากยอดเดิม
            </p>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>วัสดุ</th>
                    <th>จำนวนตามแผน / ที่เพิ่ม</th>
                    <th>ได้มาแล้ว (ยอดสะสม)</th>
                    <th>ยังขาดตามใบประเมิน</th>
                    <th>งบซื้อเพิ่มประมาณการ</th>
                    <th>สถานะวัสดุ</th>
                  </tr>
                </thead>
                <tbody>
                  {plannedMaterials.map((m) => {
                    const acquired = Number(acquiredQuantities[m.id] ?? 0);
                    const remaining = Math.max(0, Math.round((m.quantity - acquired) * 100) / 100);
                    return (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.material_name}</strong>
                          <small className="table-subtext">{m.use_for || "—"}</small>
                          {!quotationMaterials.some((quoted) => quoted.id === m.id) && <span className="badge badge-blue">วัสดุใหม่ระหว่างทำงาน</span>}
                        </td>
                        <td>
                          {m.quantity} {m.unit}
                        </td>
                        <td>
                          <div className="input-with-unit">
                            <input
                              className="w-28"
                              aria-label={`ได้มาแล้ว ${m.material_name}`}
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              disabled={!canUpdatePurchases}
                              value={acquiredQuantities[m.id] ?? "0"}
                              onChange={(e) => {
                                setAcquiredQuantities({
                                  ...acquiredQuantities,
                                  [m.id]: e.target.value,
                                });
                                setPurchaseMessage("");
                              }}
                            />
                            <span>{m.unit}</span>
                          </div>
                        </td>
                        <td className={remaining === 0 ? "text-green" : "text-blue"}>
                          {remaining} {m.unit}
                        </td>
                        <td>฿{money(remaining * m.unit_cost)}</td>
                        <td>
                          <span className={`badge badge-${remaining === 0 ? "green" : "amber"}`}>
                            {remaining === 0 ? "วัสดุครบแล้ว" : "ยังต้องซื้อเพิ่ม"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="page-note">
              ยอดสะสมรวมการซื้อเพิ่มแล้ว · ยังขาด = จำนวนที่วางไว้ − ยอดสะสม (ต่ำสุด 0)
              การซื้อเพิ่มไม่เปลี่ยนยอดใบเสนอราคา
            </p>
            <div className="form-actions">
              <p className="text-sm text-blue" role="status">
                {purchaseMessage ||
                  (!canUpdatePurchases && project.status !== "completed"
                    ? "อัปเดตยอดจัดซื้อได้เมื่อลูกค้าตกลงงานแล้ว"
                    : "")}
              </p>
              {canUpdatePurchases && <Button type="submit">บันทึกยอดที่ได้มาแล้ว</Button>}
            </div>
          </form>
        )}
      </Section>
    </>
  );
}
