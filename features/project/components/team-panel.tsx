"use client";

import { useState, type FormEvent } from "react";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { useProjects } from "../project-provider";
import { getPhoneNumberError, MAX_PHONE_LENGTH } from "@/lib/phone";
import type { Project } from "../types";

export function TeamPanel({
  project,
  onSave,
}: {
  project: Project;
  onSave: (project: Project) => Promise<boolean>;
}) {
  const { data, saving, addEmployee } = useProjects();
  const [selected, setSelected] = useState(project.employee_ids);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [draft, setDraft] = useState({ employee_name: "", role: "", phone_number: "" });
  const canAssign = !["pending", "estimated", "completed", "reject"].includes(project.status);
  const query = search.trim().toLocaleLowerCase("th");
  const employees = data.employees.filter((employee) =>
    `${employee.employee_name} ${employee.role} ${employee.phone_number}`.toLocaleLowerCase("th").includes(query),
  );

  async function createEmployee(event: FormEvent) {
    event.preventDefault();
    if (!canAssign || creating || saving) return;
    setCreating(true);
    setCreateError("");
    try {
      const employee = await addEmployee(draft);
      if (!employee) {
        setCreateError("เพิ่มพนักงานไม่สำเร็จ ตรวจสอบรายละเอียดด้านบนแล้วลองอีกครั้ง");
        return;
      }
      setSelected((previous) => [...new Set([...previous, employee.id])]);
      setSearch("");
      setShowCreate(false);
      setDraft({ employee_name: "", role: "", phone_number: "" });
      setPhoneError("");
      setMessage(`เพิ่ม ${employee.employee_name} แล้ว กดยืนยันการมอบหมายเพื่อบันทึกทีมของงานนี้`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Section
      title="เลือกพนักงานที่รับผิดชอบ"
      description="เลือกรายชื่อที่เคยสร้างไว้ หรือเพิ่มพนักงานใหม่ แล้วมอบหมายให้โครงการนี้"
      action={canAssign && (
        <Button
          type="button"
          variant="outline"
          disabled={saving || creating}
          aria-expanded={showCreate}
          aria-controls={`create-employee-${project.id}`}
          onClick={() => { setShowCreate(!showCreate); setCreateError(""); }}
        >
          <UserPlus size={16} aria-hidden="true" />
          เพิ่มพนักงานใหม่
        </Button>
      )}
    >
      {showCreate && canAssign && (
        <form id={`create-employee-${project.id}`} onSubmit={createEmployee} className="mx-6 mb-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <h3 className="text-sm font-semibold">เพิ่มพนักงานใหม่</h3>
          <p className="mt-1 text-xs text-slate-500">รายชื่อนี้จะเก็บไว้ให้เลือกใช้ในโครงการอื่นได้ด้วย</p>
          <fieldset disabled={creating || saving} className="m-0 mt-4 min-w-0 border-0 p-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                ชื่อพนักงาน
                <input required maxLength={255} autoComplete="name" value={draft.employee_name}
                  onChange={(event) => setDraft({ ...draft, employee_name: event.target.value })} />
              </label>
              <label className="grid gap-1.5 text-sm">
                ตำแหน่ง / หน้าที่
                <input required maxLength={100} placeholder="เช่น ช่างติดตั้ง" value={draft.role}
                  onChange={(event) => setDraft({ ...draft, role: event.target.value })} />
              </label>
              <label className="grid gap-1.5 text-sm">
                เบอร์โทรศัพท์
                <input required type="tel" inputMode="tel" autoComplete="tel" value={draft.phone_number}
                  aria-describedby={phoneError ? `employee-phone-error-${project.id}` : undefined}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value.length > MAX_PHONE_LENGTH) {
                      setPhoneError(getPhoneNumberError(value) ?? "");
                      return;
                    }
                    setPhoneError("");
                    setDraft({ ...draft, phone_number: value });
                  }} />
                {phoneError && <span id={`employee-phone-error-${project.id}`} role="alert" className="text-xs text-red-600">{phoneError}</span>}
              </label>
            </div>
            {createError && <p role="alert" className="mt-3 text-sm text-red-600">{createError}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setCreateError(""); }}>ยกเลิก</Button>
              <Button type="submit" disabled={!draft.employee_name.trim() || !draft.role.trim() || !draft.phone_number.trim()}>
                {creating ? "กำลังเพิ่มพนักงาน…" : "บันทึกและเลือกพนักงาน"}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      <div className="px-6 pb-4">
        <label className="grid gap-2 text-sm">
          <span className="flex items-center gap-2"><Search size={16} aria-hidden="true" />ค้นหารายชื่อพนักงาน</span>
          <input type="search" placeholder="ค้นหาจากชื่อ ตำแหน่ง หรือเบอร์โทร" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <p className="mt-2 text-xs text-slate-500" role="status">เลือกแล้ว {selected.length} คน</p>
      </div>
      {!employees.length && (
        <p className="px-6 pb-5 text-sm text-slate-500">
          {data.employees.length ? "ไม่พบรายชื่อที่ค้นหา ลองค้นหาใหม่หรือเพิ่มพนักงานใหม่" : "ยังไม่มีรายชื่อพนักงาน กดเพิ่มพนักงานใหม่เพื่อเริ่มต้น"}
        </p>
      )}
      <div className="team-options">
        {employees.map((employee) => (
          <label
            key={employee.id}
            className={`team-option ${selected.includes(employee.id) ? "selected" : ""}`}
          >
            <input
              type="checkbox"
              disabled={!canAssign || saving || creating}
              checked={selected.includes(employee.id)}
              onChange={(e) => {
                const checked = e.target.checked;
                setSelected((previous) => checked
                  ? [...previous, employee.id]
                  : previous.filter((id) => id !== employee.id));
                setMessage("");
              }}
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
            type="button"
            disabled={!selected.length || saving || creating || showCreate}
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
