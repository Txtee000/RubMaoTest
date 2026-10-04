"use client";

import Link from "next/link";
import { Phone, ArrowUpRight } from "lucide-react";
import { useProjects } from "@/features/project/project-provider";
import { PageHeading, LoadingState } from "@/features/shared/ui";

export function EmployeePage() {
  const { data, ready } = useProjects();
  if (!ready) return <LoadingState />;
  return (
    <>
      <PageHeading
        eyebrow="OUR TEAM"
        title="ทีมงาน"
        description="ดูพนักงานและงานที่ได้รับมอบหมาย เลือกทีมได้จากหน้ารายละเอียดงาน"
      />
      <div className="employee-grid">
        {data.employees.map((employee) => {
          const tasks = data.projects.filter(
            (p) => p.employee_ids.includes(employee.id) && p.status !== "completed",
          );
          return (
            <section key={employee.id} className="employee-card">
              <h2>{employee.employee_name}</h2>
              <p className="text-muted">{employee.role}</p>
              <a className="employee-phone" href={`tel:${employee.phone_number}`}>
                <Phone size={14} />
                {employee.phone_number}
              </a>
              <div className="employee-work">
                <span>งานที่กำลังดูแล</span>
                <strong>{tasks.length} งาน</strong>
              </div>
              <div className="employee-projects">
                {tasks.length ? (
                  tasks.map((p) => (
                    <Link key={p.id} href={`/project/${p.id}`} className="group">
                      <div className="group-hover:text-black">
                        {p.order_name}
                      </div>
                      <ArrowUpRight size={14} className="group-hover:text-black"/>
                    </Link>
                  ))
                ) : (
                  <small className="text-muted">ยังไม่มีงานที่มอบหมาย</small>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
