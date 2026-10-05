"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import type { Material, Project } from "../types";

export function AdditionalMaterialPanel({ project, onSave }: {
  project: Project;
  onSave: (project: Project) => void;
}) {
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [name, setName] = useState("");
  const [useFor, setUseFor] = useState("");
  const [unit, setUnit] = useState("");
  const [cost, setCost] = useState("0");
  const [message, setMessage] = useState("");
  const editable = !!project.quotation && !["pending", "estimated", "completed"].includes(project.status);
  const materials = project.materials;
  const selected = materials.find((m) => m.id === materialId);
  const isNew = materialId === "new";
  const current = selected?.acquired_quantity ?? 0;
  const extra = Number(quantity);
  const validExtra = quantity.trim() !== "" && Number.isFinite(extra) && extra > 0;

  function save(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    if ((!selected && !isNew) || !validExtra) {
      setMessage("เลือกวัสดุ และกรอกจำนวนที่ซื้อเพิ่มมากกว่า 0");
      return;
    }
    if (isNew && (!name.trim() || !unit.trim() || !cost.trim() || !Number.isFinite(Number(cost)) || Number(cost) < 0)) {
      setMessage("กรอกชื่อวัสดุ หน่วย และราคาต่อหน่วยให้ครบ ราคาต้องไม่น้อยกว่า 0");
      return;
    }
    const total = Math.round((current + extra) * 1000) / 1000;
    if (!Number.isFinite(total)) {
      setMessage("จำนวนมากเกินไป กรุณาตรวจสอบอีกครั้ง");
      return;
    }
    const material: Material = selected ?? {
      id: crypto.randomUUID(), material_name: name.trim(), use_for: useFor.trim(),
      quantity: extra, unit: unit.trim(), unit_cost: Number(cost), acquired_quantity: total,
    };
    onSave({
      ...project,
      materials: isNew ? [...materials, material] : materials.map((m) => m.id === material.id ? { ...m, acquired_quantity: total } : m),
      history: [...project.history, {
        date: new Date().toISOString(),
        text: `${isNew ? "เพิ่มวัสดุใหม่" : "ซื้อวัสดุเพิ่ม"} · ${material.material_name}${material.use_for ? ` / ${material.use_for}` : ""} · เพิ่ม ${extra} ${material.unit} · ยอดสะสม ${current} → ${total} ${material.unit}`,
      }],
    });
    setQuantity("1");
    if (isNew) {
      setMaterialId(material.id);
      setName(""); setUseFor(""); setUnit(""); setCost("0");
    }
    setMessage(`บันทึก ${material.material_name} เพิ่ม ${extra} ${material.unit} แล้ว ยอดสะสม ${total} ${material.unit}`);
  }

  return <Section title="ซื้อเพิ่ม / เพิ่มวัสดุใหม่" description="เลือกวัสดุเดิมเพื่อบวกยอดซื้อ หรือเพิ่มวัสดุใหม่ลงในรายการของงาน">
    {editable ? <form onSubmit={save}>
      <div className="form-grid">
        <label>วัสดุ / ใช้สำหรับ
          <select required value={materialId} onChange={(e) => { setMaterialId(e.target.value); setMessage(""); }}>
            <option value="">เลือกวัสดุเดิม</option>
            <option value="new">+ เพิ่มวัสดุใหม่</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.material_name} / {m.use_for || "ไม่ระบุการใช้งาน"}</option>)}
          </select>
        </label>
        {isNew && <>
          <label>ชื่อวัสดุ<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>ใช้สำหรับ<input value={useFor} onChange={(e) => setUseFor(e.target.value)} /></label>
          <label>หน่วย<input required value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="เช่น เส้น / แผ่น / ถุง" /></label>
          <label>ราคาต่อหน่วย (บาท)<input type="number" min="0" step="0.01" required value={cost} onChange={(e) => setCost(e.target.value)} /></label>
        </>}
        <label>จำนวนที่ซื้อเพิ่ม{selected ? ` (${selected.unit})` : ""}
          <input type="number" required min="0.001" step="0.001" value={quantity} onChange={(e) => { setQuantity(e.target.value); setMessage(""); }} />
        </label>
      </div>
      {selected && <p className="notice">ได้มาแล้ว {current} {selected.unit} → หลังบันทึก {validExtra ? Math.round((current + extra) * 1000) / 1000 : current} {selected.unit}</p>}
      <div className="form-actions"><p role="status" className="text-sm text-blue">{message}</p><Button type="submit" disabled={!selected && !isNew}>{isNew ? "บันทึกวัสดุใหม่" : "บันทึกซื้อเพิ่ม"}</Button></div>
    </form> : <p className="text-muted">ซื้อเพิ่มได้หลังลูกค้าตกลงงาน และก่อนปิดงาน</p>}
    <p className="page-note">ยอดซื้อเพิ่มรวมกับวัสดุเดิม และบันทึกไว้ในประวัติการทำงาน ยอดใบเสนอราคาคงเดิม</p>
  </Section>;
}
