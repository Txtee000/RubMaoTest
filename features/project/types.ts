export type ProjectStatus =
  | "pending"
  | "estimated"
  | "reject"
  | "confirmed"
  | "waiting_shop_inspection"
  | "shop_passed"
  | "waiting_site_inspection"
  | "site_passed"
  | "delivered_shop"
  | "delivered_site"
  | "accepted"
  | "revision_shop"
  | "revision_site"
  | "completed";

export type Material = {
  id: number;
  material_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  use_for: string;
};

export type Payment = {
  id: number;
  amount: number;
  payment_date: string;
  proof_of_payment: string;
};

export type Appointment = {
  id: number;
  project_id: number;
  appointment_type: "installation" | "pickup" | "site_visit";
  appointment_datetime: string;
  location: string;
  status: "pending" | "completed";
  reminder_status: "pending" | "sent" | "failed";
  reminder_sent_at: string | null;
};

export type AppointmentInput = Omit<Appointment, "reminder_status" | "reminder_sent_at">;

export type Employee = { id: number; employee_name: string; role: string; phone_number: string };

export type Project = {
  customer_id: number;
  id: number;
  order_name: string;
  description_project: string;
  customer_name: string;
  phone_number: string;
  status: ProjectStatus;
  materials: Material[];
  base_cost: number;
  labor_cost: number;
  final_cost: number;
  service_percent: number;
  payments: Payment[];
  employee_ids: number[];
};

export type AppData = { projects: Project[]; employees: Employee[]; appointments: Appointment[] };
