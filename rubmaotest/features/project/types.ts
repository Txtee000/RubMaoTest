export type ProjectStatus =
  | "pending"
  | "estimated"
  | "confirmed"
  | "waiting_shop_inspection"
  | "shop_passed"
  | "waiting_site_inspection"
  | "site_passed"
  | "delivered"
  | "accepted"
  | "revision"
  | "completed";

export type Material = {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  use_for: string;
};

export type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  proof_of_payment: string;
  status: "pending" | "paid";
};

export type Appointment = {
  id: string;
  project_id: string;
  appointment_type: "site_visit" | "installation" | "pickup";
  appointment_datetime: string;
  location: string;
  status: "pending" | "completed";
};

export type Employee = { id: string; employee_name: string; role: string; phone_number: string };

export type Project = {
  id: string;
  order_name: string;
  description_project: string;
  customer_name: string;
  phone_number: string;
  status: ProjectStatus;
  created_at: string;
  materials: Material[];
  labor_cost: number;
  service_percent: number;
  // Keep the agreed quotation separate from actual quantities changed during work.
  quotation?: { materials: Material[]; labor_cost: number; service_percent: number };
  payments: Payment[];
  employee_ids: string[];
  delivery_type?: "pickup" | "installation";
  payment_type: "deposit" | "full";
  revision_stage?: "shop" | "site";
  history: { date: string; text: string }[];
};

export type DemoData = { projects: Project[]; employees: Employee[]; appointments: Appointment[] };
