"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { calculatePrice, money } from "../project-utils";
import type { Material, Project } from "../types";

export function EstimatePanel({
  project,
  onSave,
}: {
  project: Project;
  onSave: (project: Project) => void;
}) {
  const source = project.quotation ?? project;
  const [materials, setMaterials] = useState<Material[]>(source.materials);
  const [labor, setLabor] = useState(source.labor_cost);
  const [percent, setPercent] = useState(source.service_percent);
  const [message, setMessage] = useState("");
  const editable =
    project.status === "pending" ||
    (project.status === "estimated" && project.payments.length === 0);
  const price = calculatePrice(materials, labor, percent);

  function addMaterial() {
    setMaterials([
      ...materials,
      {
        id: crypto.randomUUID(),
        material_name: "",
        quantity: 1,
        unit: "",
        unit_cost: 0,
        use_for: "",
      },
    ]);
    setMessage("");
  }
  function editMaterial(id: string, field: keyof Material, value: string | number) {
    setMaterials(materials.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    setMessage("");
  }
  function saveEstimate(event: FormEvent) {
    event.preventDefault();
    if (!materials.length) {
      setMessage("เพิ่มวัสดุอย่างน้อย 1 รายการก่อนยืนยัน");
      return;
    }
    if (price.final_cost <= 0) {
      setMessage("ราคางานต้องมากกว่า 0 บาท");
      return;
    }
    const cleanMaterials = materials.map((m) => ({
      ...m,
      material_name: m.material_name.trim(),
      unit: m.unit.trim(),
      use_for: m.use_for.trim(),
    }));
    if (cleanMaterials.some((m) => !m.material_name || !m.unit)) {
      setMessage("กรอกชื่อวัสดุและหน่วยให้ครบ");
      return;
    }
    onSave({
      ...project,
      materials: cleanMaterials,
      labor_cost: labor,
      service_percent: percent,
      quotation: {
        materials: structuredClone(cleanMaterials),
        labor_cost: labor,
        service_percent: percent,
      },
      status: "estimated",
      history: [
        ...project.history,
        { date: new Date().toISOString(), text: "ยืนยันใบเสนอราคา รอลูกค้าพิจารณา" },
      ],
    });
    setMessage("บันทึกใบเสนอราคาแล้ว เปิดหน้าบิลเพื่อคัดลอกลิงก์ให้ลูกค้าได้");
  }

  return (
    <form onSubmit={saveEstimate}>
      <Section
        title="รายการวัสดุ"
        description="กรอกวัสดุของงานโดยตรง พร้อมหน่วยและราคาต่อหน่วย"
        action={
          editable && (
            <Button type="button" variant="outline" onClick={addMaterial}>
              <Plus size={16} />
              เพิ่มวัสดุ
            </Button>
          )
        }
      >
        {!editable && (
          <p className="notice">
            แสดงใบเสนอราคาที่ตกลงไว้ การบันทึกวัสดุใช้จริงจะไม่เปลี่ยนราคานี้
          </p>
        )}
        <div className="table-scroll">
          <table className="data-table material-table w-full">
            <thead>
              <tr>
                <th>วัสดุ / ใช้สำหรับ</th>
                <th className="w-[90px]">จำนวน</th>
                <th>หน่วย</th>
                <th>ราคา/หน่วย</th>
                <th>รวม</th>
                <th>ข้อความ</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {materials.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    
                    <input
                      aria-label={`ชื่อวัสดุ ${index + 1}`}
                      required
                      disabled={!editable}
                      placeholder="ชื่อวัสดุ"
                      value={item.material_name}
                      onChange={(e) => editMaterial(item.id, "material_name", e.target.value)}
                    />
                    
                    
                  </td>
                  <td>
                    <input
                      aria-label={`จำนวนวัสดุ ${index + 1}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      disabled={!editable}
                      value={item.quantity}
                      onChange={(e) => editMaterial(item.id, "quantity", Number(e.target.value))}
          
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`หน่วยวัสดุ ${index + 1}`}
                      required
                      disabled={!editable}
                      placeholder="เส้น"
                      value={item.unit}
                      onChange={(e) => editMaterial(item.id, "unit", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`ราคาวัสดุ ${index + 1}`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      disabled={!editable}
                      value={item.unit_cost}
                      onChange={(e) => editMaterial(item.id, "unit_cost", Number(e.target.value))}
                    />
                  </td>
                  <td className="tabular">{money(item.quantity * item.unit_cost)}</td>
                  <td>
                    <input
                      className="comment-input"
                      aria-label={`หมายเหตุวัสดุ ${index + 1}`}
                      disabled={!editable}
                      placeholder="ใช้สำหรับ… (เว้นว่างได้)"
                      value={item.use_for}
                      onChange={(e) => editMaterial(item.id, "use_for", e.target.value)}
                    />
                  </td>
                  {editable && (
                    <td>
                      <button
                        type="button"
                        className="icon-button text-red"
                        aria-label={`ลบวัสดุ ${index + 1}`}
                        onClick={() => setMaterials(materials.filter((m) => m.id !== item.id))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!materials.length && (
          <div className="empty-state">
            <p className="text-muted">เริ่มประเมินด้วยการเพิ่มรายการวัสดุ</p>
            <Button type="button" onClick={addMaterial}>
              <Plus size={16} />
              เพิ่มวัสดุรายการแรก
            </Button>
          </div>
        )}
      </Section>
      <div className="estimate-columns">
        <Section title="ค่าแรงและค่าบริการ">
          <div className="form-grid">
            <label>
              ค่าแรง (บาท)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                disabled={!editable}
                value={labor}
                onChange={(e) => setLabor(Number(e.target.value))}
              />
            </label>
            <label>
              ค่าบริการ (%)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                disabled={!editable}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
              />
            </label>
          </div>
          <p className="page-note">ค่าบริการคิดจากค่าวัสดุรวมค่าแรง</p>
        </Section>
        <Section title="สรุปราคา">
          <dl className="price-summary">
            <div>
              <dt>ค่าวัสดุ (base_cost)</dt>
              <dd>฿{money(price.base_cost)}</dd>
            </div>
            <div>
              <dt>ค่าแรง</dt>
              <dd>฿{money(price.labor_cost)}</dd>
            </div>
            <div>
              <dt>ต้นทุนรวม</dt>
              <dd>฿{money(price.total_cost)}</dd>
            </div>
            <div>
              <dt>ค่าบริการ {percent}%</dt>
              <dd>฿{money(price.service_cost)}</dd>
            </div>
            <div className="price-total">
              <dt>ราคาสุดท้าย</dt>
              <dd>฿{money(price.final_cost)}</dd>
            </div>
          </dl>
        </Section>
      </div>
      <div className="form-actions">
        <p role="status" className="text-sm text-blue">
          {message}
        </p>
        {editable ? (
          <Button size="lg" type="submit">
            <Save size={16} />
            ตรวจสอบและยืนยันราคา
          </Button>
        ) : (
          <Link className="button-link" href={`/project/${project.id}/bill`}>
            <FileText size={16} />
            เปิดใบเสนอราคา
          </Link>
        )}
      </div>
    </form>
  );
}
