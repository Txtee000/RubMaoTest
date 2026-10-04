import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EmptyState, StatusBadge } from "@/features/shared/ui";
import { calculatePayments, money, projectPrice } from "../project-utils";
import type { Project } from "../types";

export function ProjectTable({ projects }: { projects: Project[] }) {
  if (!projects.length)
    return <EmptyState title="ไม่พบงาน" description="ลองเปลี่ยนคำค้นหาหรือสถานะที่เลือก" />;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>งาน / ลูกค้า</th>
            <th>สถานะงาน</th>
            <th>ราคางาน</th>
            <th>การชำระเงิน</th>
            <th>
              <span className="sr-only">เปิดงาน</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const price = projectPrice(project);
            const payment = calculatePayments(price.final_cost, project.payments);
            return (
              <tr key={project.id}>
                <td>
                  <Link className="project-name" href={`/project/${project.id}`}>
                    <span className="project-symbol">{project.order_name.slice(0, 1)}</span>
                    <span>
                      <strong>{project.order_name}</strong>
                      <small>
                        #{project.id} · {project.customer_name}
                      </small>
                    </span>
                  </Link>
                </td>
                <td>
                  <StatusBadge status={project.status} />
                </td>
                <td className="tabular">
                  {project.status === "pending" ? (
                    <span className="text-muted">รอประเมิน</span>
                  ) : (
                    <>฿{money(price.final_cost)}</>
                  )}
                </td>
                <td>
                  <span
                    className={`payment-label ${payment.remaining === 0 && payment.paid_total > 0 ? "text-green" : ""}`}
                  >
                    {payment.label}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/project/${project.id}`}
                    className="icon-link"
                    aria-label={`เปิดงาน ${project.order_name}`}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
