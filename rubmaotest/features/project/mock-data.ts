import type { DemoData, Material, Project, ProjectStatus } from "./types";

const materials: Material[] = [
  {
    id: "m1",
    material_name: "เหล็กกล่อง 1.5 นิ้ว",
    quantity: 12,
    unit: "เส้น",
    unit_cost: 420,
    use_for: "โครงหลัก",
  },
  {
    id: "m2",
    material_name: "แผ่นเมทัลชีท",
    quantity: 8,
    unit: "แผ่น",
    unit_cost: 650,
    use_for: "หลังคา",
  },
  {
    id: "m3",
    material_name: "สีรองพื้นกันสนิม",
    quantity: 2,
    unit: "กระป๋อง",
    unit_cost: 380,
    use_for: "เก็บผิวงาน",
  },
];

function project(
  id: string,
  name: string,
  customer: string,
  status: ProjectStatus,
  description: string,
): Project {
  return {
    id,
    order_name: name,
    customer_name: customer,
    phone_number: "081-234-5678",
    description_project: description,
    status,
    created_at: "2026-10-02T09:00:00+07:00",
    materials: status === "pending" ? [] : structuredClone(materials),
    labor_cost: 4500,
    service_percent: 10,
    payments: [],
    employee_ids: [],
    payment_type: "deposit",
    history: [{ date: "2026-10-02T09:00:00+07:00", text: "รับรายละเอียดงานจากลูกค้า" }],
    ...(status !== "pending"
      ? {
          quotation: {
            materials: structuredClone(materials),
            labor_cost: 4500,
            service_percent: 10,
          },
        }
      : {}),
  };
}

export const mockData: DemoData = {
  employees: [
    { id: "e1", employee_name: "สมชาย ใจดี", role: "ช่างเหล็ก", phone_number: "081-111-2233" },
    { id: "e2", employee_name: "วิชัย งานดี", role: "ช่างติดตั้ง", phone_number: "082-222-3344" },
    { id: "e3", employee_name: "เอกชัย มั่นคง", role: "ผู้ช่วยช่าง", phone_number: "083-333-4455" },
  ],
  projects: [
    project(
      "01",
      "หลังคาโรงจอดรถ",
      "คุณณัฐพล",
      "pending",
      "หลังคาโรงจอดรถขนาด 4 × 6 เมตร โครงเหล็กสีดำ หลังคาเมทัลชีท พร้อมติดตั้ง",
    ),
    project(
      "02",
      "ประตูรั้วหน้าบ้าน",
      "คุณศิริพร",
      "estimated",
      "ประตูรั้วเหล็กบานเลื่อน กว้าง 4 เมตร ออกแบบเรียบและแข็งแรง",
    ),
    {
      ...project(
        "03",
        "ชั้นวางสินค้า",
        "คุณธนากร",
        "confirmed",
        "ชั้นเหล็ก 3 ชั้น จำนวน 4 ชุด สำหรับร้านขายสินค้า",
      ),
      employee_ids: ["e1", "e3"],
      payments: [
        {
          id: "pay1",
          amount: 5000,
          payment_date: "2026-10-03",
          status: "paid",
          proof_of_payment: "รับเงินมัดจำหน้าร้าน",
        },
      ],
    },
    {
      ...project(
        "04",
        "กันสาดหน้าร้าน",
        "คุณพิมพ์ชนก",
        "shop_passed",
        "กันสาดหน้าร้าน กว้าง 5 เมตร พร้อมเก็บสีและติดตั้ง",
      ),
      employee_ids: ["e2", "e3"],
    },
    {
      ...project(
        "05",
        "โต๊ะทำงานเหล็ก",
        "คุณกิตติ",
        "waiting_shop_inspection",
        "โต๊ะโครงเหล็กหน้าท็อปไม้ ขนาด 120 × 60 ซม.",
      ),
      employee_ids: ["e1"],
    },
  ],
  appointments: [
    {
      id: "a1",
      project_id: "01",
      appointment_type: "site_visit",
      appointment_datetime: "2026-10-06T10:00:00+07:00",
      location: "บ้านลูกค้า · บางนา กรุงเทพฯ",
      status: "pending",
    },
  ],
};
