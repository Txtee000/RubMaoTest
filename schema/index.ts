/** IDs are application-generated strings; timestamps are ISO 8601 strings. */
export interface Customer {
  customer_id: string;
  customer_name: string;
  phone_number: string;
  line_id: string | null;
}

export interface Project {
  project_id: string;
  customer_id: string;
  description_project: string | null;
  status: string;
  base_cost: number;
  labor_cost: number;
  service_percent: number;
  final_cost: number;
  order_name: string;
}

export interface Employee {
  employee_id: string;
  employee_name: string;
  role: string;
  phone_number: string;
}

export interface WorkOn {
  employee_id: string;
  project_id: string;
}

export interface Appointment {
  appointment_id: string;
  project_id: string;
  customer_id: string;
  appointment_type: "site_visit" | "pickup";
  location: string;
  appointment_datetime: string;
  status: string;
  reminder_status: "pending" | "send" | "failed";
  reminder_sent_at: string | null;
}

export interface JobMaterial {
  job_material_id: string;
  project_id: string;
  quantity: number;
  material_name: string;
  use_for: string | null;
  unit: string;
  unit_cost: number;
}

export interface Payment {
  payment_id: string;
  project_id: string;
  proof_of_payment: string | null;
  payment_date: string | null;
  status: string;
  amount: number;
}
