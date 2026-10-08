"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import type { Customer } from "@/schema";
import { getCustomer } from "@/service/customer";
import { createProject } from "@/service/project";
import { useProjects } from "../project-provider";

export function CreateProjectForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const { reload } = useProjects();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [orderName, setOrderName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getCustomer({}, controller.signal)
      .then(setCustomers)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "โหลดลูกค้าไม่สำเร็จ");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!orderName.trim() || !customerId || !customers.some((customer) => customer.customer_id === Number(customerId))) {
      setError("กรอกชื่องานและเลือกลูกค้าที่มีอยู่ก่อนสร้างโครงการ");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const project = await createProject({
        customer_id: Number(customerId), order_name: orderName.trim(), description_project: description.trim() || null,
        status: "pending", base_cost: 0, labor_cost: 0, service_percent: 0, final_cost: 0,
      });
      await reload();
      router.push(`/project/${project.project_id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "สร้างโครงการไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <Section title="สร้างโครงการ" description="เลือกลูกค้าที่มีอยู่และบันทึกงานใหม่ แล้วประเมินราคาในหน้ารายละเอียดงาน">
      <form
        onSubmit={save}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
          }
        }}
      >
        <fieldset disabled={saving} className="border-0 p-0 m-0 min-w-0">
          <div className="form-grid">
            <label>ชื่องาน
              <input required maxLength={255} value={orderName} onChange={(event) => setOrderName(event.target.value)} />
            </label>
            <label>ลูกค้า
              <select required disabled={loading} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="" disabled>เลือกลูกค้า</option>
                {customers.map((customer) => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.customer_name} · {customer.phone_number}
                  </option>
                ))}
              </select>
            </label>
            <label>รายละเอียดงาน
              <textarea maxLength={10000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </div>
          {!loading && !error && customers.length === 0 && (
            <p role="status" className="text-muted pl-6">ยังไม่มีข้อมูลลูกค้า กรุณาเพิ่มลูกค้าในระบบก่อนสร้างโครงการ</p>
          )}
          {error && <p role="alert" className="text-red-600 pl-6">{error}</p>}
          <div className="form-actions">
            <Button type="button" variant="outline" onClick={onCancel}>ยกเลิก</Button>
            <Button type="submit" disabled={loading || !customerId}>{saving ? "กำลังสร้างโครงการ…" : "สร้างโครงการ"}</Button>
          </div>
        </fieldset>
      </form>
    </Section>
  );
}
