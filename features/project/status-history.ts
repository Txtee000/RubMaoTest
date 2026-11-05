import type { Project } from "./types";

export function getStatusHistoryItems(logs: Project["status_logs"]) {
  const sorted = [...logs].sort((a, b) =>
    new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime() || a.id - b.id,
  );
  let hasRevision = false;
  return sorted.map((log, index) => {
    const previous = sorted[index - 1]?.status;
    let reason: "ตรวจไม่ผ่าน" | "ลูกค้าขอแก้" | "งานแก้ไข" | undefined;
    if (log.status === "revision_shop" || log.status === "revision_site") {
      if (previous === "waiting_shop_inspection" || previous === "waiting_site_inspection") reason = "ตรวจไม่ผ่าน";
      if (previous === "delivered_shop" || previous === "delivered_site") reason = "ลูกค้าขอแก้";
      hasRevision = true;
    } else if (hasRevision && (log.status === "waiting_shop_inspection" || log.status === "waiting_site_inspection")) {
      reason = "งานแก้ไข";
    }
    return { ...log, reason };
  });
}
