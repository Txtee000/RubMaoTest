import type { Material, Payment, Project, ProjectStatus } from "./types";

export const statusLabels: Record<ProjectStatus, string> = {
  pending: "รอประเมิน",
  estimated: "รอลูกค้าตกลง",
  confirmed: "เตรียมงาน / กำลังทำที่ร้าน",
  waiting_shop_inspection: "รอตรวจที่ร้าน",
  shop_passed: "งานที่ร้านผ่านแล้ว",
  waiting_site_inspection: "รอตรวจหน้างาน",
  site_passed: "หน้างานผ่านแล้ว",
  delivered: "ส่งมอบแล้ว",
  accepted: "ลูกค้าตรวจรับแล้ว",
  revision: "รอแก้ไข",
  completed: "ปิดงานแล้ว",
};

export const appointmentLabels = {
  site_visit: "ดูหน้างาน",
  installation: "ติดตั้งหน้างาน",
  pickup: "รับที่ร้าน",
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
  const source = project.quotation ?? project;
  return calculatePrice(source.materials, source.labor_cost, source.service_percent);
}

export function calculatePayments(
  final_cost: number,
  payments: Pick<Payment, "amount" | "status">[],
) {
  const paid_total = round(
    payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
  );
  const remaining = Math.max(0, round(final_cost - paid_total));
  const label = paid_total === 0 ? "ยังไม่ชำระ" : remaining > 0 ? "ชำระบางส่วน" : "ชำระครบ";
  return { paid_total, remaining, label };
}

// Excel statuses are the source of truth; payments never advance the work status.
export function canChangeStatus(
  current: ProjectStatus,
  next: ProjectStatus,
  delivery?: Project["delivery_type"],
  remaining = 0,
) {
  if (next === "completed") return current === "accepted" && remaining === 0;
  if (current === "shop_passed" && next === "delivered") return delivery === "pickup";
  if (current === "shop_passed" && next === "waiting_site_inspection")
    return delivery === "installation";
  const allowed: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
    pending: ["estimated"],
    estimated: ["confirmed"],
    confirmed: ["waiting_shop_inspection"],
    waiting_shop_inspection: ["shop_passed", "revision"],
    waiting_site_inspection: ["site_passed", "revision"],
    site_passed: ["delivered"],
    delivered: ["accepted", "revision"],
    revision: ["waiting_shop_inspection", "waiting_site_inspection"],
  };
  return allowed[current]?.includes(next) ?? false;
}
