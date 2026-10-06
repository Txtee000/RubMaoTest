"use client";

import { useState, type FormEvent } from "react";
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
  const [proof, setProof] = useState("");
  const [message, setMessage] = useState("");
  const price = projectPrice(project);
  const payment = calculatePayments(price.final_cost, project.payments);
  const canReceive = !["pending", "estimated", "completed", "reject"].includes(project.status);

  async function savePayment(event: FormEvent) {
    event.preventDefault();
    const value = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(value) || value <= 0 || value > payment.remaining) {
      setMessage("จำนวนเงินต้องมากกว่า 0 และไม่เกินยอดคงเหลือ");
      return;
    }
    const saved = await onSave({
      ...project,
      payments: [
        ...project.payments,
        {
          id: -1, // รหัสชั่วคราว; ไม่ส่งเป็น primary key ใน POST
          amount: value,
          payment_date: date,
          proof_of_payment: proof.trim(),
        },
      ],
    });
    if (!saved) { setMessage("บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน"); return; }
    setAmount("");
    setProof("");
    setMessage("บันทึกรายการชำระเงินแล้ว");
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
                <th>หลักฐาน / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {project.payments.map((item) => (
                <tr key={item.id}>
                  <td>{item.payment_date ? formatDate(item.payment_date) : "—"}</td>
                  <td>฿{money(item.amount)}</td>
                  <td className="proof-cell">{item.proof_of_payment || "—"}</td>
                </tr>
              ))}
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
                หลักฐาน / หมายเหตุ
                <input
                  required
                  placeholder="เลขอ้างอิงการโอน ชื่อไฟล์ หรือหมายเหตุรับเงินสด"
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                />
              </label>
            </div>
            <div className="form-actions">
              <p className="text-sm text-blue" role="status">
                {message}
              </p>
              <Button type="submit">บันทึกการรับเงิน</Button>
            </div>
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
