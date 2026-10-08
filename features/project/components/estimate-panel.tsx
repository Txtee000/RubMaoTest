"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { calculatePrice, money, projectPrice } from "../project-utils";
import type { Material, Project } from "../types";

function DecimalInput({ value, onChange, disabled, label }: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  label: string;
}) {
  const [text, setText] = useState(value.toFixed(2));
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      required
      disabled={disabled}
      pattern="[0-9]+([.][0-9]{1,2})?"
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        if (!/^\d*(\.\d{0,2})?$/.test(next)) return;
        setText(next);
        onChange(Number(next) || 0);
      }}
      onBlur={() => {
        if (text && Number.isFinite(Number(text))) {
          setText(Number(text).toFixed(2));
        }
      }}
    />
  );
}

export function EstimatePanel({
  project,
  onSave,
}: {
  project: Project;
  onSave: (project: Project) => Promise<boolean>;
}) {
  const source = project;
  const [materials, setMaterials] = useState<Material[]>(source.materials);
  const [labor, setLabor] = useState(source.labor_cost);
  const [percent, setPercent] = useState(source.service_percent);
  const [message, setMessage] = useState("");
  const editable =
    project.status === "pending" ||
    (project.status === "estimated" && project.payments.length === 0);
  const price = editable ? calculatePrice(materials, labor, percent) : projectPrice(project);

  function addMaterial() {
    setMaterials([
      ...materials,
      {
        // รหัสชั่วคราวในฟอร์มเท่านั้น; POST ให้ฐานข้อมูลสร้าง ID จริง
        id: Math.min(0, ...materials.map((item) => item.id)) - 1,
        material_name: "",
        quantity: 1,
        unit: "",
        unit_cost: 0,
        use_for: "",
      },
    ]);
    setMessage("");
  }
  function editMaterial(id: number, field: keyof Material, value: string | number) {
    setMaterials(materials.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    setMessage("");
  }
  async function saveEstimate(event: FormEvent) {
    event.preventDefault();
    if (!materials.length) {
      setMessage("เพิ่มวัสดุอย่างน้อย 1 รายการก่อนยืนยัน");
      return;
    }
    if (materials.some((item) => item.quantity < 0.01 || item.unit_cost < 0)) {
      setMessage("จำนวนต้องอย่างน้อย 0.01 และราคาต่อหน่วยต้องไม่ติดลบ");
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
    const saved = await onSave({
      ...project,
      materials: cleanMaterials,
      labor_cost: labor,
      service_percent: percent,
      base_cost: price.base_cost,
      final_cost: price.final_cost,
      status: "estimated",
    });
    // service ใส่ ID จริงกลับในรายการที่เพิ่มสำเร็จแล้ว
    setMaterials(cleanMaterials);
    if (!saved) { setMessage("บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน"); return; }
    setMessage("บันทึกการประเมินราคาแล้ว เปิดหน้าบิลเพื่อพิมพ์ใบเสนอราคาได้");
  }

  return (
    <form
      onSubmit={saveEstimate}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
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
            แสดงรายการวัสดุและราคาที่บันทึกไว้
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
                    <DecimalInput
                      label={`จำนวนวัสดุ ${index + 1}`}
                      disabled={!editable}
                      value={item.quantity}
                      onChange={(value) => editMaterial(item.id, "quantity", value)}
          
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
                    <DecimalInput
                      label={`ราคาวัสดุ ${index + 1}`}
                      disabled={!editable}
                      value={item.unit_cost}
                      onChange={(value) => editMaterial(item.id, "unit_cost", value)}
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
                className="plain-number-input"
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
                className="plain-number-input"
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
