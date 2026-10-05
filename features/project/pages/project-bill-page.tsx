"use client";

import { useState } from "react";
import { Hammer, Link2, Printer, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "../project-provider";
import { formatDate, money, projectPrice } from "../project-utils";
import { EmptyState, LoadingState } from "@/features/shared/ui";

export function ProjectBillPage({ projectId }: { projectId: string }) {
  const { data, ready } = useProjects();
  const [message, setMessage] = useState("");
  const project = data.projects.find((p) => p.id === projectId);
  if (!ready) return <LoadingState />;
  if (!project?.quotation)
    return (
      <div className="bill-page">
        <EmptyState
          title="ยังไม่มีใบเสนอราคานี้"
          description="ตรวจสอบรหัสงาน หรือรอเจ้าของร้านยืนยันใบเสนอราคา"
        />
      </div>
    );
  const quote = project.quotation;
  const price = projectPrice(project);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("คัดลอกลิงก์แล้ว");
    } catch {
      setMessage("คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอก URL จากแถบที่อยู่");
    }
  }
  return (
    <div className="bill-page">
      <div className="bill-toolbar">
        <span>ใบเสนอราคา · #{project.id}</span>
        <div className="button-row">
          <Button variant="outline" onClick={copyLink}>
            {message === "คัดลอกลิงก์แล้ว" ? <Check size={16} /> : <Link2 size={16} />}คัดลอกลิงก์
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            พิมพ์ / บันทึก PDF
          </Button>
        </div>
      </div>
      {message && (
        <p role="status" className="bill-message">
          {message}
        </p>
      )}
      <article className="bill-sheet">
        <header className="bill-header">
          <div className="brand">
            <span className="brand-mark">
              <Hammer size={25} />
            </span>
            <span>
              RubMao<span className="brand-caption">งานรับเหมาและงานสั่งทำ</span>
            </span>
          </div>
          <div>
            <p className="eyebrow">QUOTATION</p>
            <h1>ใบเสนอราคา</h1>
            <p>เลขที่ QT-{project.id}</p>
          </div>
        </header>
        <div className="bill-customer">
          <div>
            <span>เสนอราคาสำหรับ</span>
            <h2>{project.customer_name}</h2>
            <p>{project.phone_number}</p>
          </div>
          <div>
            <span>วันที่สร้างงาน</span>
            <p>{formatDate(project.created_at)}</p>
            <span>งาน</span>
            <p>{project.order_name}</p>
          </div>
        </div>
        <p className="bill-description">{project.description_project}</p>
        <div className="table-scroll">
          <table className="data-table bill-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th>จำนวน</th>
                <th>ราคา/หน่วย</th>
                <th>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {quote.materials.map((m, index) => (
                <tr key={m.id}>
                  <td>
                    <strong>
                      {index + 1}. {m.material_name}
                    </strong>
                    {m.use_for && <small className="table-subtext">{m.use_for}</small>}
                  </td>
                  <td>
                    {m.quantity} {m.unit}
                  </td>
                  <td>{money(m.unit_cost)}</td>
                  <td>{money(m.quantity * m.unit_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bill-summary">
          <dl className="price-summary">
            <div>
              <dt>ค่าวัสดุ</dt>
              <dd>{money(price.base_cost)}</dd>
            </div>
            <div>
              <dt>ค่าแรง</dt>
              <dd>{money(price.labor_cost)}</dd>
            </div>
            <div>
              <dt>ต้นทุนรวม</dt>
              <dd>{money(price.total_cost)}</dd>
            </div>
            <div>
              <dt>ค่าบริการ {price.service_percent}%</dt>
              <dd>{money(price.service_cost)}</dd>
            </div>
            <div className="price-total">
              <dt>ยอดรวมทั้งสิ้น</dt>
              <dd>฿{money(price.final_cost)}</dd>
            </div>
          </dl>
        </div>
        <div className="bill-note">
          <strong>หมายเหตุ</strong>
          <p>โปรดตรวจสอบรายการและแจ้งผลการพิจารณากับเจ้าของร้านก่อนเริ่มงาน</p>
          <p>
            รูปแบบชำระเงิน:{" "}
            {project.payment_type === "full" ? "ชำระเต็มจำนวน" : "มัดจำและชำระส่วนที่เหลือ"}
          </p>
        </div>
        <footer className="bill-footer">ขอบคุณที่ไว้วางใจให้เราดูแลงานของคุณ</footer>
      </article>
      <p className="bill-demo-note">
        ตัวอย่าง frontend · ใบเสนอราคาที่แก้ไขเก็บเฉพาะเบราว์เซอร์นี้
        การแชร์ข้อมูลล่าสุดข้ามอุปกรณ์ต้องเชื่อมฐานข้อมูล
      </p>
    </div>
  );
}
