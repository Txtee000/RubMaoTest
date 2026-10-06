"use client";

import Link from "next/link";
import { useProjects } from "@/features/project/project-provider";
import { PageHeading, Section, LoadingState } from "@/features/shared/ui";
import { calculatePayments, money, projectPrice } from "@/features/project/project-utils";

export function PaymentPage() {
  const { data, ready } = useProjects();
  if (!ready) return <LoadingState />;
  const projects = data.projects.filter((p) => !["pending", "reject"].includes(p.status));
  return (
    <>
      <PageHeading
        eyebrow="PAYMENTS"
        title="การชำระเงิน"
        description="ยอดรับเงินและยอดคงเหลือ แยกจากสถานะการทำงาน"
      />
      <Section
        title="สรุปยอดตามใบเสนอราคา"
        description="รวมงานที่ประเมินแล้ว เปิดแต่ละงานเพื่อบันทึกหรือตรวจสอบการรับเงิน"
      >
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>งาน</th>
                <th>ราคางาน</th>
                <th>รับเงินแล้ว</th>
                <th>ยอดคงเหลือ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const price = projectPrice(p);
                const payment = calculatePayments(price.final_cost, p.payments);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link className="text-link" href={`/project/${p.id}?tab=payment`}>
                        {p.order_name}
                      </Link>
                      <small className="table-subtext">{p.customer_name}</small>
                    </td>
                    <td>฿{money(price.final_cost)}</td>
                    <td className="text-green">฿{money(payment.paid_total)}</td>
                    <td>฿{money(payment.remaining)}</td>
                    <td>
                      <span
                        className={`badge badge-${payment.remaining === 0 ? "green" : "amber"}`}
                      >
                        {payment.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
