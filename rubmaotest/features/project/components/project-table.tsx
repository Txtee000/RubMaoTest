import Link from "next/link";
import { ArrowUpRight, FolderOpenDot } from "lucide-react";

import { EmptyState, StatusBadge } from "@/features/shared/ui";
import { calculatePayments, money, projectPrice } from "../project-utils";
import type { Project } from "../types";
import { useRouter } from "next/navigation"

export function ProjectTable({ projects }: { projects: Project[] }) {

  const router = useRouter()

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
              <tr key={project.id} onClick={() => router.push(`/project/${project.id}`)} className="hover:cursor-pointer">
                <td>
                  <div className="project-name">
                    <span className="project-symbol"><FolderOpenDot size={16}/></span>
                    <span>
                      <strong>{project.order_name}</strong>
                      <small>
                        #{project.id} · {project.customer_name}
                      </small>
                    </span>
                  </div>
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
                  <div
                    
                    className="icon-link"
                    aria-label={`เปิดงาน ${project.order_name}`}
                  >
                    <ArrowUpRight size={18} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
