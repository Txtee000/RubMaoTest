import type { ReactNode } from "react";
import { statusLabels } from "../project/project-utils";
import type { ProjectStatus } from "../project/types";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const color =
    status === "completed" || status.endsWith("passed") || status === "accepted"
      ? "green"
      : status === "revision"
        ? "red"
        : status === "pending" || status === "estimated"
          ? "amber"
          : "blue";
  return (
    <span className={`badge badge-${color}`}>
      <span className="badge-dot" />
      {statusLabels[status]}
    </span>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p className="text-muted text-sm">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">◇</div>
      <h3>{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="loading-state" role="status">
      กำลังโหลดข้อมูลงาน…
    </div>
  );
}
