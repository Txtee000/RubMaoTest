"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { parsePaymentProof, PROOF_MAX_SIZE, PROOF_TYPES } from "@/lib/payment-proof";
import { readResponse } from "@/service/api";
import { Button } from "@/components/ui/button";
import { Section } from "@/features/shared/ui";
import { calculatePayments, formatDate, money, projectPrice } from "../project-utils";
import type { Project } from "../types";

export function PaymentPanel({
  project,
  onSave,
}: {
  project: Project;
  onSave: (project: Project) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()),
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<{ path: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const price = projectPrice(project);
  const payment = calculatePayments(price.final_cost, project.payments);
  const canReceive = !["pending", "estimated", "completed", "reject"].includes(project.status);

  async function savePayment(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(value) || value <= 0 || value > payment.remaining) {
      setMessage("จำนวนเงินต้องมากกว่า 0 และไม่เกินยอดคงเหลือ");
      return;
    }
    if (!file) { setMessage("กรุณาแนบหลักฐานการรับเงินก่อนบันทึก"); return; }
    setBusy(true);
    try {
    let attachment = uploaded;
    if (file && !attachment) {
      const form = new FormData();
      form.append("file", file);
      form.append("project_id", String(project.id));
      attachment = await readResponse<{ path: string; name: string }>(await fetch("/api/payment/proof", { method: "POST", body: form }));
      setUploaded(attachment);
    }
    const saved = await onSave({
      ...project,
      payments: [
        ...project.payments,
        {
          id: -1, // รหัสชั่วคราว; ไม่ส่งเป็น primary key ใน POST
          amount: value,
          payment_date: date,
          proof_of_payment: JSON.stringify({ ...attachment, note: "" }),
        },
      ],
    });
    if (!saved) { setMessage("บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน"); return; }
    setAmount("");
    setFile(null);
    setUploaded(null);
    if (fileInput.current) fileInput.current.value = "";
    setMessage("บันทึกรายการชำระเงินแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกหลักฐานไม่สำเร็จ");
    } finally { setBusy(false); }
  }
  return (
    <>
      <div className="payment-stats">
        <div>
          <span>ราคางาน</span>
          <strong>฿{money(price.final_cost)}</strong>
        </div>
        <div>
          <span>รับเงินแล้ว</span>
          <strong className="text-green">฿{money(payment.paid_total)}</strong>
        </div>
        <div>
          <span>ยอดคงเหลือ</span>
          <strong className="text-blue">฿{money(payment.remaining)}</strong>
        </div>
      </div>
      <Section title="ประวัติการรับเงิน">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>จำนวนเงิน</th>
                <th>หลักฐานการรับเงิน</th>
              </tr>
            </thead>
            <tbody>
              {project.payments.map((item) => {
                const attachment = parsePaymentProof(item.proof_of_payment);
                return (
                <tr key={item.id}>
                  <td>{item.payment_date ? formatDate(item.payment_date) : "—"}</td>
                  <td>฿{money(item.amount)}</td>
                  <td className="proof-cell">{attachment ? <div className="flex flex-col gap-1">
                    <a className="text-link inline-flex items-center gap-2" href={`/api/payment/proof?path=${encodeURIComponent(attachment.path)}`} target="_blank" rel="noopener noreferrer"><FileText size={16} />{attachment.name}</a>
                    {attachment.note && <span>{attachment.note}</span>}
                  </div> : item.proof_of_payment || "—"}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
        {!project.payments.length && (
          <p className="empty-state text-muted">ยังไม่มีรายการรับเงิน</p>
        )}
      </Section>
      {canReceive && payment.remaining > 0 && (
        <Section title="บันทึกการรับเงิน" description="บันทึกยอดที่หัวหน้าได้รับเงินจริง">
          <form onSubmit={savePayment}>
            <fieldset disabled={busy} className="border-0 p-0 m-0 min-w-0">
            <div className="form-grid">
              <label>
                จำนวนเงิน (บาท)
                <input
                  type="number"
                  min="0.01"
                  max={payment.remaining}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label>
                วันที่ชำระ
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="full-width">
                <span className="inline-flex items-center gap-2"><Paperclip size={16} /> แนบหลักฐานการรับเงิน</span>
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setUploaded(null);
                  if (selected && (!PROOF_TYPES[selected.type] || selected.size > PROOF_MAX_SIZE || selected.size === 0)) {
                    setFile(null); event.target.value = ""; setMessage("เลือก JPG, PNG, WebP หรือ PDF ขนาดไม่เกิน 3 MB"); return;
                  }
                  setFile(selected); setMessage("");
                }} />
                <small className="text-muted">รูป JPG, PNG, WebP หรือ PDF · สูงสุด 3 MB · 1 ไฟล์ต่อรายการ</small>
              </label>
              {file && <div className="full-width flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
                <span className="break-all">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
                <Button type="button" variant="outline" aria-label="เอาไฟล์แนบออก" onClick={() => { setFile(null); setUploaded(null); if (fileInput.current) fileInput.current.value = ""; }}><X size={16} /></Button>
              </div>}
            </div>
            <div className="form-actions">
              <p className="text-sm text-blue" role="status">
                {message}
              </p>
              <Button type="submit" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึกการรับเงิน"}</Button>
            </div>
            </fieldset>
          </form>
        </Section>
      )}
      {(!canReceive || payment.remaining === 0) && (
        <p className="notice" role="status">
          {message ||
            (payment.remaining === 0 && payment.paid_total > 0
              ? "ชำระครบแล้ว ปิดงานได้หลังลูกค้าตรวจรับ"
              : "บันทึกการรับเงินได้เมื่อลูกค้าตกลงงานแล้ว")}
        </p>
      )}
    </>
  );
}
