"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Phone,
  UserRound,
  Clock3,
  ClipboardList,
  Package,
  Users,
  CalendarDays,
  Wallet,
  GitBranch,
} from "lucide-react";
import { useProjects } from "../project-provider";
import { calculatePayments, formatDate, money, projectPrice } from "../project-utils";
import { EmptyState, LoadingState, Section, StatusBadge } from "@/features/shared/ui";
import { EstimatePanel } from "../components/estimate-panel";
import { MaterialPanel } from "../components/material-panel";
import { TeamPanel } from "../components/team-panel";
import { AppointmentPanel } from "../components/appointment-panel";
import { PaymentPanel } from "../components/payment-panel";
import { WorkflowPanel } from "../components/workflow-panel";

const tabs = [
  { id: "workflow", label: "ความคืบหน้า", icon: GitBranch },
  { id: "estimate", label: "ประเมินราคา", icon: ClipboardList },
  { id: "material", label: "วัสดุ / จัดซื้อ", icon: Package },
  { id: "team", label: "ทีมงาน", icon: Users },
  { id: "appointment", label: "นัดหมาย", icon: CalendarDays },
  { id: "payment", label: "การเงิน", icon: Wallet },
];

export function ProjectDetailPage({
  projectId,
  initialTab = "workflow",
}: {
  projectId: string;
  initialTab?: string;
}) {
  const { data, ready, updateProject } = useProjects();
  const [tab, setTab] = useState(tabs.some((t) => t.id === initialTab) ? initialTab : "workflow");
  const project = data.projects.find((p) => p.id === projectId);
  if (!ready) return <LoadingState />;
  if (!project)
    return (
      <>
        <Link href="/project" className="back-link">
          <ArrowLeft size={16} />
          กลับรายการงาน
        </Link>
        <EmptyState title="ไม่พบงานนี้" description="ตรวจสอบรหัสงาน หรือกลับไปเลือกรายการงาน" />
      </>
    );
  const price = projectPrice(project);
  const payments = calculatePayments(price.final_cost, project.payments);
  return (
    <>
      <Link className="back-link" href="/project">
        <ArrowLeft size={16} />
        รายการงาน
      </Link>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">PROJECT #{project.id}</p>
          <h1>{project.order_name}</h1>
          <div className="detail-meta">
            <StatusBadge status={project.status} />
            <span>
              <UserRound size={14} />
              {project.customer_name}
            </span>
            <span>
              <Phone size={14} />
              {project.phone_number}
            </span>
          </div>
        </div>
        {project.quotation && (
          <Link className="button-link" href={`/project/${project.id}/bill`}>
            <FileText size={16} />
            ดูใบเสนอราคา
          </Link>
        )}
      </div>
      <div className="project-overview">
        <div>
          <span>รายละเอียดงาน</span>
          <p>{project.description_project}</p>
        </div>
        <div>
          <span>ราคาที่เสนอ</span>
          <strong>
            {project.status === "pending" ? "รอประเมิน" : `฿${money(price.final_cost)}`}
          </strong>
        </div>
        <div>
          <span>การชำระเงิน</span>
          <strong
            className={
              payments.remaining === 0 && payments.paid_total > 0 ? "text-green" : "text-blue"
            }
          >
            {payments.label}
          </strong>
          <small>
            {project.status === "pending"
              ? "รอประเมินราคา"
              : `ยอดคงเหลือ ฿${money(payments.remaining)}`}
          </small>
        </div>
        <div>
          <span>วิธีรับงาน</span>
          <strong>
            {project.delivery_type === "pickup"
              ? "รับที่ร้าน"
              : project.delivery_type === "installation"
                ? "ติดตั้งหน้างาน"
                : "เลือกหลังตรวจที่ร้านผ่าน"}
          </strong>
        </div>
      </div>
      <div className="detail-tabs" role="tablist" aria-label="รายละเอียดงาน">
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            className={tab === item.id ? "selected" : ""}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>
      <div className="detail-panels">
        {/* Keep panels mounted while switching tabs so unfinished form edits are preserved. */}
        <div
          role="tabpanel"
          id="panel-workflow"
          aria-labelledby="tab-workflow"
          hidden={tab !== "workflow"}
        >
          <WorkflowPanel
            project={project}
            onSave={updateProject}
            onSchedule={() => setTab("appointment")}
          />
          <Section title="ประวัติการทำงาน" action={<Clock3 size={18} className="text-muted" />}>
            <ol className="history-list">
              {[...project.history].reverse().map((item, index) => (
                <li key={`${item.date}-${index}`}>
                  <span className="history-dot" />
                  <div>
                    <p>{item.text}</p>
                    <small>{formatDate(item.date, true)}</small>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>
        <div
          role="tabpanel"
          id="panel-estimate"
          aria-labelledby="tab-estimate"
          hidden={tab !== "estimate"}
        >
          <EstimatePanel project={project} onSave={updateProject} />
        </div>
        <div
          role="tabpanel"
          id="panel-material"
          aria-labelledby="tab-material"
          hidden={tab !== "material"}
        >
          <MaterialPanel
            key={JSON.stringify(project.quotation?.materials) ?? "draft"}
            project={project}
            onSave={updateProject}
          />
        </div>
        <div role="tabpanel" id="panel-team" aria-labelledby="tab-team" hidden={tab !== "team"}>
          <TeamPanel project={project} onSave={updateProject} />
        </div>
        <div
          role="tabpanel"
          id="panel-appointment"
          aria-labelledby="tab-appointment"
          hidden={tab !== "appointment"}
        >
          <AppointmentPanel project={project} />
        </div>
        <div
          role="tabpanel"
          id="panel-payment"
          aria-labelledby="tab-payment"
          hidden={tab !== "payment"}
        >
          <PaymentPanel project={project} onSave={updateProject} />
        </div>
      </div>
    </>
  );
}
