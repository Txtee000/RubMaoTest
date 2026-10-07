# Service สำหรับเรียก Backend

ลำดับข้อมูล: **หน้าเว็บ → provider → service → API route → Supabase**

แต่ละตารางมีไฟล์ของตัวเอง เช่น `project.ts`, `customer.ts`, `employee.ts`
ภายในมีฟังก์ชัน `get...`, `create...`, `update...`, `delete...`
และเขียน `fetch()` ไว้ในฟังก์ชันโดยตรง

```ts
import { getProject, updateProject } from "@/service/project";

const projects = await getProject();
const pendingProjects = await getProject({ status: "pending" });
const selectedProjects = await getProject({ id: "1" });

await updateProject(1, { order_name: "ชื่อใหม่" });
```

- แก้ URL หรือ JSON ที่ส่ง: ไฟล์ service ของตารางนั้น
- แก้การรวมลูกค้า วัสดุ ทีม และเงินเข้าในโครงการ: `workspace.ts` → `getWorkspace()`
- แก้การบันทึกข้อมูลในแท็บงาน: `workspace.ts` → `saveProjectDetails()`
- แก้การบันทึกนัดหมาย: `workspace.ts` → `saveProjectAppointment()`
- แก้การจัดการ loading/error: `features/project/project-provider.tsx`
- แก้การตรวจข้อมูลฝั่ง server: `app/api/<ชื่อตาราง>/route.ts`
- แก้ชนิดข้อมูลจากฐานข้อมูล: `schema/index.ts`
- แก้ชนิดข้อมูลที่หน้าจอใช้: `features/project/types.ts`

`api.ts` ช่วยอ่าน JSON และโยน Error เมื่อ HTTP ไม่สำเร็จ
ฟอร์มจะรอ API สำเร็จก่อนแสดงข้อความบันทึกแล้ว และไม่เก็บข้อมูลสำรองในเบราว์เซอร์

## ตั้งค่าฐานข้อมูล

1. ถ้ายังไม่มีตาราง ให้รัน `schema/schema.sql` ใน Supabase SQL Editor
2. ตั้งค่า Supabase URL และ key ตาม `lib/supabase.ts` พร้อมสิทธิ์ RLS ของฐานข้อมูล
3. ตั้งค่า `BOSS_USERNAME`, `BOSS_PASSWORD`, `AUTH_SECRET` สำหรับการเข้าสู่ระบบเดิม
4. หัวหน้าสร้างโครงการจากหน้ารายการงาน เลือกลูกค้าเดิมหรือกรอกลูกค้าใหม่ได้ ส่วนพนักงานเพิ่มผ่าน API ข้อมูลที่ไม่มีรายการจะแสดงเป็นว่าง

ระบบใช้เฉพาะคอลัมน์ใน `schema/schema.sql` ไม่ต้องเพิ่มคอลัมน์
ID ทุกตารางเป็นจำนวนเต็ม; POST ไม่ส่ง primary key และใช้ ID ที่ฐานข้อมูลส่งกลับ
รายการวัสดุที่ยังไม่บันทึกใช้เลขติดลบเป็นรหัสชั่วคราวในฟอร์มเท่านั้น
การประเมินราคาเก็บวัสดุใน `job_material` และราคาใน `project`
ใบเสนอราคาพิมพ์จากรายการและราคาปัจจุบันที่บันทึกไว้ หน้าบิลต้องเข้าสู่ระบบ
นัดหมายมีติดตั้งหน้างาน (`installation`), รับที่ร้าน (`pickup`) และดูหน้างาน (`site_visit`)

## การบันทึกหลายตาราง

`saveProjectDetails()` เรียก CRUD ของวัสดุ เงิน ทีม และโครงการตามลำดับ
คำขอหลายรายการนี้ไม่ใช่ transaction เดียว หากบางคำขอล้มเหลว รายการก่อนหน้าอาจถูกบันทึกแล้ว
provider จะแสดงข้อผิดพลาดและโหลดข้อมูลจริงกลับมา เพื่อให้ตรวจและบันทึกส่วนที่เหลือได้
ไม่แสดงข้อความสำเร็จเมื่อบันทึกไม่ครบ

ไม่ได้รันเทสหรือส่งคำขอเขียน/ลบฐานข้อมูลในการแก้โค้ดครั้งนี้
