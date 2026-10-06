"use client";

import Link from "next/link";
import { useState } from "react";
import { useProjects } from "@/features/project/project-provider";
import { EmptyState, PageHeading, Section, StatusBadge, LoadingState } from "@/features/shared/ui";
import { ArrowUpRight } from "lucide-react";

export function TaskPage() {
  const { data, ready } = useProjects();
  const [employeeId, setEmployeeId] = useState("all");
  if (!ready) return <LoadingState />;
  const tasks = data.projects.filter(
    (p) =>
      p.employee_ids.length &&
      p.status !== "completed" &&
      (employeeId === "all" || p.employee_ids.includes(Number(employeeId))),
  );
  return (
    <>
      <PageHeading
        eyebrow="ASSIGNED WORK"
        title="งานที่ได้รับมอบหมาย"
        description="ดูทีมที่รับผิดชอบและเปิดงานเพื่อบันทึกความคืบหน้า"
      />
      <Section
        title="งานของทีม"
        action={
          <select
            aria-label="เลือกพนักงาน"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="all">ทีมงานทั้งหมด</option>
            {data.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employee_name}
              </option>
            ))}
          </select>
        }
      >
        {tasks.length ? (
          <div className="task-grid">
            {tasks.map((p) => (
              <Link key={p.id} href={`/project/${p.id}`} className="task-card">
                <StatusBadge status={p.status} />
                <h3>{p.order_name}</h3>
                <p className="text-muted">{p.description_project}</p>
                <div className="task-card-footer">
                  <span>
                    {data.employees
                      .filter((e) => p.employee_ids.includes(e.id))
                      .map((e) => e.employee_name.split(" ")[0])
                      .join(", ")}
                  </span>
                  <ArrowUpRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="ยังไม่มีงานที่ได้รับมอบหมาย"
            description="เลือกพนักงานในแท็บทีมงานของแต่ละ Project"
          />
        )}
      </Section>
    </>
  );
}
