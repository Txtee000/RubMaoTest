"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, FolderKanban } from "lucide-react";
import { PageHeading, Section, LoadingState } from "@/features/shared/ui";
import { useProjects } from "../project-provider";
import { statusLabels } from "../project-utils";
import { ProjectTable } from "../components/project-table";

export function ProjectListPage() {
  const { data, ready } = useProjects();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  if (!ready) return <LoadingState />;
  const projects = data.projects.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      `${p.id} ${p.order_name} ${p.customer_name}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="PROJECTS"
        title="รายการงาน"
        description="รายละเอียดทุกงาน ตั้งแต่ประเมินราคาจนถึงส่งมอบ"
        action={
          <span className="heading-counter">
            <FolderKanban size={17} />
            {data.projects.length} งานทั้งหมด
          </span>
        }
      />
      <Section
        title="งานของร้าน"
        description="เลือกงานเพื่อประเมินราคา วางแผน และติดตามความคืบหน้า"
      >
        <div className="filter-row">
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="ค้นหางาน"
              placeholder="ค้นหาชื่องาน ลูกค้า หรือรหัสงาน…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="select-filter">
            <SlidersHorizontal size={17} />
            <select
              aria-label="กรองสถานะงาน"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">ทุกสถานะ</option>
              {Object.entries(statusLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ProjectTable projects={projects} />
        <div className="table-footer">
          แสดง {projects.length} จาก {data.projects.length} งาน
          <span>งานใหม่จะมาจากส่วนลูกค้า / LINE OA</span>
        </div>
      </Section>
    </>
  );
}
