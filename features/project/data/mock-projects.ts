import type { Project, ProjectStatus } from "../types";
import { mockMaterials } from "./mock-materials";

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
    materials: status === "pending" ? [] : structuredClone(mockMaterials),
    labor_cost: 4500,
    service_percent: 10,
    payments: [],
    employee_ids: [],
    payment_type: "deposit",
    history: [{ date: "2026-10-02T09:00:00+07:00", text: "รับรายละเอียดงานจากลูกค้า" }],
    ...(status !== "pending"
      ? {
          quotation: {
            materials: structuredClone(mockMaterials),
            labor_cost: 4500,
            service_percent: 10,
          },
        }
      : {}),
  };
}

export const mockProjects: Project[] = [
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
  ];
