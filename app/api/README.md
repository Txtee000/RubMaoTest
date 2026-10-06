# API ของ RubMao

CRUD อยู่ใน `route.ts` ของแต่ละตารางโดยตรง และใช้ Supabase client จาก `lib/supabase.ts`
ทุก endpoint ด้านล่างต้องเข้าสู่ระบบของแอปก่อน ตาม `proxy.ts` ที่มีอยู่

| Endpoint | ตาราง | รหัสหลัก | ตัวกรอง GET เพิ่มเติม |
| --- | --- | --- | --- |
| `/api/customer` | customer | customer_id | phone_number |
| `/api/project` | project | project_id | customer_id, status |
| `/api/employee` | employee | employee_id | role |
| `/api/work_on` | work_on | employee_id + project_id | employee_id, project_id |
| `/api/appointment` | appointment | appointment_id | project_id, customer_id, status, appointment_type |
| `/api/job_material` | job_material | job_material_id | project_id |
| `/api/payment` | payment | payment_id | project_id |

## รูปแบบการเรียก

- `GET /api/project`: อ่านรายการ ตอบ `{ "projects": [...] }`
- `GET /api/project?id=รหัสงาน&status=pending`: อ่านรายการที่ตรงกับตัวกรองทั้งหมด
- `POST /api/project`: เพิ่มข้อมูลจาก JSON body ตอบ `{ "project": {...} }` พร้อม status 201
- `PUT /api/project?id=รหัสงาน`: แก้ไขเฉพาะช่องที่ส่งมาใน JSON body ตอบ `{ "project": {...} }`
- `DELETE /api/project?id=รหัสงาน`: ลบรายการ ตอบ `{ "message": "ลบข้อมูลแล้ว", "deleted": {...} }`

ตารางทั่วไปใช้ `?id=...` หรือชื่อ primary key จริง เช่น `?project_id=...` ได้
ID ทุกตารางเป็นจำนวนเต็ม รวมถึง foreign key
POST ไม่รับ primary key ของรายการใหม่ ให้ฐานข้อมูลสร้าง ID อัตโนมัติ (identity/default)
work_on ส่ง employee_id และ project_id ของรายการที่มีอยู่แล้ว ส่วน PUT ไม่เปลี่ยน primary key ของตารางอื่น
GET ตอบเป็น array แม้ระบุรหัสของรายการเดียว

`work_on` ใช้รหัสคู่: `PUT` และ `DELETE` ต้องระบุ
`/api/work_on?employee_id=รหัสพนักงาน&project_id=รหัสงาน`
POST รับ `{ "employee_id": 1, "project_id": 1 }`
PUT ส่ง `employee_id` หรือ `project_id` ใหม่ใน body เพื่อเปลี่ยนการมอบหมายเดิม
GET ตอบ `{ "assignments": [...] }` และ POST/PUT ตอบ `{ "assignment": {...} }`

## ตัวอย่างเพิ่มลูกค้าและโครงการ

เรียกจากหน้าเว็บหลังเข้าสู่ระบบ:

```ts
const customerResponse = await fetch("/api/customer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customer_name: "สมชาย",
    phone_number: "0812345678",
    line_id: null,
  }),
});
const customerResult = await customerResponse.json();
if (!customerResponse.ok) throw new Error(customerResult.error);

const projectResponse = await fetch("/api/project", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customer_id: customerResult.customer.customer_id,
    order_name: "งานติดตั้งประตู",
    description_project: "ติดตั้งประตูหน้าบ้าน",
    status: "pending",
    base_cost: 0,
    labor_cost: 0,
    service_percent: 0,
    final_cost: 0,
  }),
});
const projectResult = await projectResponse.json();
if (!projectResponse.ok) throw new Error(projectResult.error);
```

ตัวอย่างแก้ไขและลบ (ใช้รหัสที่ได้รับจาก POST):

```ts
const id = encodeURIComponent(String(projectResult.project.project_id));

const updateResponse = await fetch(`/api/project?id=${id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ order_name: "งานติดตั้งประตูใหม่" }),
});
const updateResult = await updateResponse.json();
if (!updateResponse.ok) throw new Error(updateResult.error);

const deleteResponse = await fetch(`/api/project?id=${id}`, { method: "DELETE" });
const deleteResult = await deleteResponse.json();
if (!deleteResponse.ok) throw new Error(deleteResult.error);
```

## ข้อมูลสำหรับ POST ของตารางอื่น

ส่งตัวเลขเป็น number และวันที่เป็น ISO 8601 เช่น `2026-10-06T09:00:00+07:00`
คอลัมน์ที่ไม่จำเป็นจะเก็บเป็น null และไม่ต้องส่ง primary key ของรายการใหม่

```jsonc
// employee
{ "employee_name": "ช่างหนึ่ง", "role": "ช่าง", "phone_number": "0812345678" }

// appointment
{
  "project_id": 1, "customer_id": 1,
  "appointment_type": "site_visit", "location": "บ้านลูกค้า",
  "appointment_datetime": "2026-10-06T09:00:00+07:00", "status": "pending"
}

// job_material
{
  "project_id": 1, "material_name": "เหล็ก", "quantity": 2,
  "unit": "เส้น", "unit_cost": 500, "use_for": "โครงประตู"
}

// payment
{
  "project_id": 1, "amount": 1000,
  "payment_date": "2026-10-06T09:00:00+07:00", "proof_of_payment": null
}
```

บล็อกด้านบนแยกตัวอย่างด้วย comment; JSON ที่ส่งจริงต้องไม่มี comment
appointment_type ใช้ `site_visit` หรือ `pickup` ตาม schema เดิม
reminder_status เป็น `pending` โดยค่าเริ่มต้น และแก้เป็น `send` หรือ `failed` ได้

## การตั้งค่าและข้อจำกัด

ต้องมีตารางตาม `schema/schema.sql` เดิม และตั้งค่า `NEXT_PUBLIC_SUPABASE_URL`
กับ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ตาม client เดิม
สิทธิ์ฐานข้อมูลและ RLS ต้องอนุญาตให้ client นี้อ่าน/เขียนด้วย
session เข้าสู่ระบบของร้านเป็นคนละระบบกับ Supabase Auth จึงไม่ได้ให้สิทธิ์ RLS แบบ authenticated โดยอัตโนมัติ

API นี้เป็น CRUD ตาม schema: ค่าราคาและสถานะมาจากข้อมูลที่ส่งมา
frontend คำนวณราคาแล้วเรียก API ผ่าน `service/` โดยตรง
อ่านรายละเอียดโครงสร้างและตัวอย่างฟังก์ชันได้ที่ `service/README.md`
การลบข้อมูลที่ถูกตารางอื่นอ้างอิงจะตอบ 409 ตาม foreign key เดิม ไม่ลบรายการลูกต่อให้
ถ้า RLS ซ่อนรายการ การแก้ไข/ลบจะตอบ 404 เหมือนกรณีไม่พบรายการ
POST/PUT/DELETE ใช้ `.select()` เพื่อส่งข้อมูลที่บันทึกกลับ จึงต้องมีสิทธิ์ SELECT ร่วมกับสิทธิ์เขียน
อ้างอิง: [Supabase — select หลังบันทึกข้อมูล](https://supabase.com/docs/reference/javascript/using-modifiers-select)

ไม่ได้รันเทสหรือเรียกเขียน/ลบข้อมูลใน Supabase ตามคำขอ
