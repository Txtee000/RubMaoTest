"use client";

import { Section, EmptyState } from "@/features/shared/ui";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "../project-provider";
import { calculatePrice, money } from "../project-utils";
import type { Project } from "../types";

export function MaterialPanel({ project }: { project: Project }) {
  const { updateProject, saving } = useProjects();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const editable = !["completed", "reject"].includes(project.status);

  async function addMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !editable) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const material = {
      id: Math.min(0, ...project.materials.map((item) => item.id)) - 1,
      material_name: String(data.get("material_name") ?? "").trim(),
      quantity: Number(data.get("quantity")),
      unit: String(data.get("unit") ?? "").trim(),
      unit_cost: Number(data.get("unit_cost")),
      use_for: String(data.get("use_for") ?? "").trim(),
    };
    if (!material.material_name || !material.unit || !Number.isFinite(material.quantity) || material.quantity < 0.01 || !Number.isFinite(material.unit_cost) || material.unit_cost < 0) {
      setMessage("กรอกชื่อวัสดุ หน่วย จำนวน และราคาให้ถูกต้อง");
      return;
    }
    setMessage("");
    const materials = [...project.materials, material];
    const price = calculatePrice(materials, project.labor_cost, project.service_percent);
    const saved = await updateProject({
      ...project,
      materials,
      base_cost: price.base_cost,
      final_cost: price.final_cost,
    });
    if (!saved) {
      setMessage("เพิ่มวัสดุไม่สำเร็จ ดูรายละเอียดด้านบน");
      return;
    }
    form.reset();
    setAdding(false);
    setMessage(`เพิ่มวัสดุและอัปเดตราคางานเป็น ฿${money(price.final_cost)} แล้ว`);
  }

  return (
    <Section title="วัสดุของงาน" description="เพิ่มวัสดุภายหลังได้ ราคางานจะคำนวณใหม่รวมค่าแรงและค่าบริการเดิม">
      {editable && (
        <div className="px-6 pb-5">
          <Button type="button" variant="outline" disabled={saving} onClick={() => { setAdding(!adding); setMessage(""); }}>
            <Plus size={16} />{adding ? "ปิดฟอร์ม" : "เพิ่มวัสดุ"}
          </Button>
        </div>
      )}
      {editable && adding && (
        <form onSubmit={addMaterial} onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
        }}>
          <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
            <div className="form-grid">
              <label>ชื่อวัสดุ<input name="material_name" required maxLength={255} /></label>
              <label>ใช้สำหรับ<input name="use_for" maxLength={10000} /></label>
              <label>จำนวน<input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required /></label>
              <label>หน่วย<input name="unit" required maxLength={50} placeholder="เช่น ชิ้น ถุง เมตร" /></label>
              <label>ราคาต่อหน่วย (บาท)<input name="unit_cost" type="number" min="0" step="0.01" required /></label>
            </div>
            <div className="form-actions">
              <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกวัสดุ"}</Button>
            </div>
          </fieldset>
        </form>
      )}
      {message && <p role="status" className="px-6 pb-4 text-sm text-blue">{message}</p>}
      {!project.materials.length ? (
        <EmptyState title="ยังไม่มีรายการวัสดุ" description="เพิ่มรายการวัสดุที่ซื้อสำหรับงานนี้" />
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
