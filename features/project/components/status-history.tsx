import { ClipboardCheck, Clock3, Flag, History, Truck, UserRoundCheck, Wrench, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Section, StatusBadge } from "@/features/shared/ui";
import { formatDate, statusLabels } from "../project-utils";
import { getStatusHistoryItems } from "../status-history";
import type { Project, ProjectStatus } from "../types";

function statusIcon(status: ProjectStatus) {
  if (status === "reject") return X;
  if (status.startsWith("revision")) return Wrench;
  if (status === "completed") return Flag;
  if (status === "accepted") return UserRoundCheck;
  if (status.endsWith("passed") || status.startsWith("waiting")) return ClipboardCheck;
  if (status.startsWith("delivered")) return Truck;
  if (status === "pending" || status === "estimated") return Clock3;
  return History;
}

export function ProjectStatusHistory({ logs, error }: { logs: Project["status_logs"]; error?: string }) {
  // Derive reasons chronologically before displaying the newest event first.
  const items = getStatusHistoryItems(logs).reverse();
  return (
    <Section title="ประวัติสถานะ" description="บันทึกทุกครั้งที่งานเปลี่ยนสถานะ">
      {error ? (
        <p role="alert" className="px-6 pb-6 text-sm text-amber-700">{error}</p>
      ) : items.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">ยังไม่มีประวัติการเปลี่ยนสถานะ</p>
      ) : (
        <ol reversed aria-label="ประวัติการเปลี่ยนสถานะ" className="px-6 pb-2">
          {items.map((log, index) => {
            const Icon = statusIcon(log.status);
            const hasDate = Number.isFinite(new Date(log.changed_at).getTime());
            return (
              <li key={log.id} className="relative flex gap-3 pb-6 last:pb-4">
                {index < items.length - 1 && (
                  <span aria-hidden="true" className="absolute top-7 bottom-0 left-3 border-l border-dashed border-slate-200" />
                )}
                <span aria-hidden="true" className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Icon size={13} strokeWidth={2} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 [&_.badge]:text-xs [&_.badge]:whitespace-normal">
                      {Object.prototype.hasOwnProperty.call(statusLabels, log.status)
                        ? <StatusBadge status={log.status} />
                        : <span className="text-sm font-medium">{log.status}</span>}
                      {index === 0 && (
                        <span className="text-[11px] font-normal text-muted-foreground">
                          ล่าสุด
                        </span>
                      )}
                      {log.reason && (
                        <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                          {log.reason}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {hasDate ? (
                    <time dateTime={log.changed_at} className="shrink-0 pt-1 text-xs text-muted-foreground sm:text-right">
                      {formatDate(log.changed_at, true)}
                    </time>
                  ) : <span className="text-xs text-muted-foreground">ไม่ระบุวันเวลา</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
