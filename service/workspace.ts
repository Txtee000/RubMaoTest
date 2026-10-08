import type { AppData, Project, Appointment, AppointmentInput } from "@/features/project/types";
import type { Project as ProjectRow, JobMaterial, Payment as PaymentRow } from "@/schema";
import { getProject, updateProject } from "./project";
import { getCustomer } from "./customer";
import { getEmployee } from "./employee";
import { getAppointment, createAppointment, updateAppointment } from "./appointment";
import { getJobMaterial, createJobMaterial, updateJobMaterial, deleteJobMaterial } from "./job_material";
import { getPayment, createPayment, updatePayment } from "./payment";
import { getWorkOn, createWorkOn, deleteWorkOn } from "./work_on";

// โหลดแต่ละตาราง แล้วรวมเป็นข้อมูลที่หน้าจอเดิมใช้
export async function getWorkspace(signal?: AbortSignal): Promise<AppData> {
  const [projects, customers, employees, materials, payments, assignments, appointments] = await Promise.all([
    getProject({}, signal), getCustomer({}, signal), getEmployee({}, signal),
    getJobMaterial({}, signal), getPayment({}, signal), getWorkOn({}, signal), getAppointment({}, signal),
  ]);

  return {
    projects: projects.map((project): Project => {
      const customer = customers.find((item) => item.customer_id === project.customer_id);
      if (!customer) throw new Error(`ไม่พบข้อมูลลูกค้าของงาน ${project.order_name}`);
      return {
        id: project.project_id, customer_id: project.customer_id,
        customer_name: customer.customer_name, phone_number: customer.phone_number,
        order_name: project.order_name, description_project: project.description_project ?? "",
        status: project.status as Project["status"],
        labor_cost: Number(project.labor_cost), service_percent: Number(project.service_percent),
        base_cost: Number(project.base_cost), final_cost: Number(project.final_cost),
        materials: materials.filter((m) => m.project_id === project.project_id).map((m) => ({
          id: m.job_material_id, material_name: m.material_name, quantity: Number(m.quantity),
          unit: m.unit,
          unit_cost: Number(m.unit_cost), use_for: m.use_for ?? "",
        })),
        payments: payments.filter((p) => p.project_id === project.project_id).map((p) => ({
          id: p.payment_id, amount: Number(p.amount), payment_date: p.payment_date ? bangkokTime(p.payment_date) : "",
          proof_of_payment: p.proof_of_payment ?? "",
        })),
        employee_ids: assignments.filter((a) => a.project_id === project.project_id).map((a) => a.employee_id),
      };
    }),
    employees: employees.map((employee) => ({
      id: employee.employee_id, employee_name: employee.employee_name,
      role: employee.role, phone_number: employee.phone_number,
    })),
    appointments: appointments.map((appointment) => ({
      id: appointment.appointment_id, project_id: appointment.project_id,
      appointment_type: appointment.appointment_type,
      appointment_datetime: bangkokTime(appointment.appointment_datetime),
      location: appointment.location, status: appointment.status as Appointment["status"],
      reminder_status: appointment.reminder_status,
      reminder_sent_at: appointment.reminder_sent_at ? bangkokTime(appointment.reminder_sent_at) : null,
    })),
  };
}

// บันทึกเฉพาะข้อมูลที่เปลี่ยนผ่าน CRUD แต่ละตาราง
// ถ้าคำขอใดล้มเหลว provider จะโหลดข้อมูลจริงใหม่และแสดงข้อผิดพลาด
export async function saveProjectDetails(project: Project, previous: Project): Promise<void> {
  for (const material of project.materials) {
    const old = previous.materials.find((item) => item.id === material.id);
    if (old && JSON.stringify(old) === JSON.stringify(material)) continue;
    const row: Omit<JobMaterial, "job_material_id"> = {
      project_id: project.id, material_name: material.material_name,
      quantity: material.quantity,
      unit: material.unit, unit_cost: material.unit_cost, use_for: material.use_for || null,
    };
    if (old) await updateJobMaterial(material.id, row);
    else {
      const created = await createJobMaterial(row);
      material.id = created.job_material_id;
    }
  }
  for (const material of previous.materials) {
    if (!project.materials.some((item) => item.id === material.id)) await deleteJobMaterial(material.id);
  }

  for (const payment of project.payments) {
    const old = previous.payments.find((item) => item.id === payment.id);
    if (old && JSON.stringify(old) === JSON.stringify(payment)) continue;
    const row: Omit<PaymentRow, "payment_id"> = {
      project_id: project.id, amount: payment.amount,
      // วันที่จากช่อง date หมายถึงเที่ยงคืนประเทศไทย
      payment_date: payment.payment_date.length === 10 ? `${payment.payment_date}T00:00:00` : localTime(payment.payment_date) || null,
      proof_of_payment: payment.proof_of_payment || null,
    };
    if (old) await updatePayment(payment.id, row);
    else {
      const created = await createPayment(row);
      payment.id = created.payment_id;
    }
  }

  for (const employee_id of project.employee_ids) {
    if (!previous.employee_ids.includes(employee_id)) await createWorkOn({ employee_id, project_id: project.id });
  }
  for (const employee_id of previous.employee_ids) {
    if (!project.employee_ids.includes(employee_id)) await deleteWorkOn(employee_id, project.id);
  }

  const changes: Partial<ProjectRow> = {
    order_name: project.order_name, description_project: project.description_project,
    status: project.status, base_cost: project.base_cost, labor_cost: project.labor_cost,
    service_percent: project.service_percent, final_cost: project.final_cost,
  };
  await updateProject(project.id, changes);
}

export async function saveProjectAppointment(appointment: AppointmentInput, project: Project, exists: boolean) {
  const row = {
    project_id: project.id, customer_id: project.customer_id,
    appointment_type: appointment.appointment_type, appointment_datetime: localTime(appointment.appointment_datetime),
    location: appointment.location, status: appointment.status,
  };
  if (exists) await updateAppointment(appointment.id, row);
  else await createAppointment(row);
}


// schema ใช้ TIMESTAMP ที่ไม่มี timezone; หน้าจอใช้เวลาประเทศไทย
function bangkokTime(value: string) {
  return /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+07:00`;
}

function localTime(value: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(bangkokTime(value)));
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
}
