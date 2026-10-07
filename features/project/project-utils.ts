import type { Appointment, Material, Payment, Project, ProjectStatus } from "./types";

export const statusLabels: Record<ProjectStatus, string> = {
  pending: "รอประเมิน",
  estimated: "รอลูกค้าตกลง",
  reject: "ลูกค้าปฏิเสธงาน",
  confirmed: "เตรียมงาน / กำลังทำที่ร้าน",
  waiting_shop_inspection: "รอหัวหน้าตรวจงาน",
  shop_passed: "งานที่ร้านผ่านแล้ว",
  waiting_site_inspection: "รอหัวหน้าตรวจหน้างาน",
  site_passed: "หน้างานผ่านแล้ว",
  delivered_shop: "ส่งมอบงานที่ร้านแล้ว",
  delivered_site: "ส่งมอบงานหน้างานแล้ว",
  accepted: "ลูกค้าตรวจรับแล้ว",
  revision_shop: "รอแก้ไขงานที่ร้าน",
  revision_site: "รอแก้ไขหน้างาน",
  completed: "ปิดงานแล้ว",
};

export const appointmentLabels: Record<Appointment["appointment_type"], string> = {
  installation: "ติดตั้งหน้างาน",
  pickup: "รับที่ร้าน",
  site_visit: "ดูหน้างาน",
};

export function money(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string, showTime = false) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
    ...(showTime ? ({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" } as const) : {}),
  }).format(new Date(value));
}

function round(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculatePrice(
  materials: Pick<Material, "quantity" | "unit_cost">[],
  labor_cost: number,
  service_percent: number,
) {
  const base_cost = round(materials.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0));
  const total_cost = round(base_cost + labor_cost);
  const service_cost = round((total_cost * service_percent) / 100);
  return {
    base_cost,
    labor_cost,
    service_percent,
    total_cost,
    service_cost,
    final_cost: round(total_cost + service_cost),
  };
}

export function projectPrice(project: Project) {
  const total_cost = round(project.base_cost + project.labor_cost);
  return {
    base_cost: project.base_cost, labor_cost: project.labor_cost,
    service_percent: project.service_percent, total_cost,
    service_cost: round(project.final_cost - total_cost), final_cost: project.final_cost,
  };
}

export function calculatePayments(
  final_cost: number,
  payments: Pick<Payment, "amount">[],
) {
  const paid_total = round(
    payments.reduce((sum, item) => sum + item.amount, 0),
  );
  const remaining = Math.max(0, round(final_cost - paid_total));
  const label = paid_total === 0 ? "ยังไม่ชำระ" : remaining > 0 ? "ชำระบางส่วน" : "ชำระครบ";
  return { paid_total, remaining, label };
}

// Excel statuses are the source of truth; payments never advance the work status.
export function canChangeStatus(
  current: ProjectStatus,
  next: ProjectStatus,
  remaining = 0,
) {
  if (next === "reject") return current === "estimated";
  if (next === "completed") return current === "accepted" && remaining === 0;
  const allowed: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
    pending: ["estimated"],
    estimated: ["confirmed"],
    confirmed: ["waiting_shop_inspection"],
    shop_passed: ["delivered_shop", "waiting_site_inspection"],
    waiting_shop_inspection: ["shop_passed", "revision_shop"],
    waiting_site_inspection: ["site_passed", "revision_site"],
    site_passed: ["delivered_site"],
    delivered_shop: ["accepted", "revision_shop"],
    delivered_site: ["accepted", "revision_site"],
    revision_shop: ["waiting_shop_inspection"],
    revision_site: ["waiting_site_inspection"],
  };
  return allowed[current]?.includes(next) ?? false;
}
