# Page List → Layout → URL

แหล่งอ้างอิง: [Car Shop — Page List](https://docs.google.com/document/d/12ZOGRXpAfyAuoTKFC5Ssw1hlnScyPDvuFS49q8jwYzY/edit?tab=t.pj093yvek6j1) และแท็บคู่มือ Github & Frontend List อ่านวันที่ 13 ต.ค. 2569

Page List ระบุหน้า public 5 กลุ่ม, Customer 4 หน้า, Seller 5 หน้า, Admin 6 หน้า และ Manager 6 หน้า รวม 26 กลุ่มหน้า
เอกสารไม่ได้ระบุ slug URL ของทุกหน้า ตารางด้านล่างเป็น convention ของ repo ที่จับคู่กับชื่อหน้าในเอกสาร ไม่ใช่ URL ที่คัดลอกจากเอกสารทั้งหมด
Login/Register อยู่ในหนึ่งกลุ่มของเอกสาร แต่แยก `/login` กับ `/register` เพื่อให้ลิงก์ชัดเจน รวมเป็น 27 URL ใน registry
รายละเอียดรถเดิม `/catalog/:name` เป็นหน้าลูกของรายการรถและยังคงอยู่ ไม่เพิ่มเข้าไปนับเป็นหน้า primary

## สิ่งที่ควรจัดให้ชัดก่อนพัฒนาฟังก์ชันต่อ

1. ใช้รายการหน้า/role/path ชุดเดียว: `apps/web/src/routes/pageList.js` เมนูและ route โครงจากแต่ละ feature อ้างอิงรายการนี้ ลด URL ชนกันหรือเมนูลิงก์ผิด
2. เพิ่ม SellerLayout ซึ่งขาดจากโครงก่อนหน้า และให้หน้าของ Seller อยู่ใต้ `/seller` ไม่ปะปนกับ Manager
3. หน้าที่ยังไม่มีใช้ PlannedPage ระบุว่ายังไม่เปิดใช้งาน ไม่แสดงข้อมูลธุรกิจปลอมหรือทำ CRUD/ธุรกรรมแทนเจ้าของ feature
4. ต้องตกลงเจ้าของงาน `ประกันของฉัน` กับ `จัดการแพ็กเกจประกัน`: Page List มีสองหน้านี้ แต่ตารางแบ่ง frontend ไม่ระบุเจ้าของชัดเจน จึงตั้ง feature เป็น null และเชื่อมเฉพาะหน้าโครงกลาง ไม่สร้าง insurance service หรือยกงานให้ใครโดยเดา
5. ประวัติธุรกรรมใช้กลุ่ม Payment เป็นจุดรวม UI ตามงานประวัติชำระเงิน/ใบแจ้งหนี้ โดยข้อมูล Order ต้องประสาน Sales ภายหลัง; ฟอร์มติดต่ออยู่กับ Sales เพราะเข้าคิวคำขอลูกค้า รายละเอียดนี้เป็นการจับคู่เพื่อ routing ไม่ใช่ API contract
6. Role Guard/Backend authorization ค่อยเชื่อมเมื่อ Identity พร้อม การมี URL แยก role ยังไม่ใช่การล็อกสิทธิ์ และ Login ยังเป็น demo

## โครง Layout และ ownership

- AppLayout / CustomerLayout ใช้ ShowroomLayout ร่วม แต่มีชุดเมนู public/Customer ของตนเอง
- AdminLayout / ManagerLayout / SellerLayout ใช้ WorkspaceLayout ร่วม แยกชื่อ role เมนู และ Outlet
- หน้า feature อยู่ตำแหน่งเดิม เพิ่มเพียง route exports ตาม role ใน `features/*/routes.jsx`
- Admin Dashboard และ Manager Dashboard ส่วนกลางยังใช้หน้าที่มีอยู่ RequestsPage, CarsPage, CarDetailPage และ LoginPage ไม่ถูกแทนที่
- `ready: true` ใน registry หมายถึงมี route ของหน้าเดิมที่ต้องรักษาไว้ ไม่ได้หมายความว่า business API หรือ auth พร้อม
- หน้าโครงใช้ component กลาง ไม่สร้างไฟล์ business page เปล่าใน feature ของเพื่อน
- รายละเอียดลูกค้าของ Seller เป็น contextual route รับ `:customerId` จึงไม่ใส่ลิงก์ ID ตัวอย่างใน Sidebar และยังไม่โหลดข้อมูลลูกค้าจริง
- `/requests` เก็บ query/hash แล้ว redirect ไป `/customer/requests`; `/customer` และ `/seller` ส่งไปหน้าหลักของ role
- `/identity`, `/sales`, `/payment`, `/reporting`, `/system-status` เดิมยังอยู่เพื่อไม่ทำลิงก์เดิมเสีย แต่ไม่ถือเป็นหน้า primary ตาม Page List
- `/admin/payments` ที่เคยอธิบายไว้เป็นตัวอย่างการต่อ route ไม่อยู่ใน Admin Page List จึงไม่เพิ่ม route หรือเมนูนี้

## แทนหน้าโครงด้วยหน้าจริง

เจ้าของ feature สร้างหน้าใน `features/<feature>/pages` แล้วส่ง component ให้ route export ของ role นั้น ตัวอย่างใน `features/sales/routes.jsx`:

```jsx
import AssignmentsPage from './pages/AssignmentsPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';

export const managerSalesRoutes = plannedRoutes('manager', 'sales', {
  assignments: <AssignmentsPage />,
});
```

จะได้หน้า `/manager/assignments` จริง ส่วน route โครงอื่นของ Sales ยังอยู่ เมนูไม่ต้องสร้างซ้ำ และไม่ต้องแก้ Layout
ถ้ามีหน้าลูกเพิ่มเติมที่ไม่ใช่ primary Page List ให้เพิ่ม route เฉพาะใน export ของ role โดยคง relative path เช่น `orders/:orderId`
ห้ามเพิ่ม route ชื่อเดียวกันซ้ำใน array เดียวกัน และไม่ย้ายหน้า public ทั้ง feature เข้าฝั่งหลังบ้าน

## ตารางจับคู่

ผลตรวจ: `npm run build`, `npm run lint`, `node scripts/check-page-list.mjs` และ `git diff --check` ผ่าน
Browser ตรวจครบ 27 URL ใน registry รวม Seller contextual detail ด้วยรหัสทดสอบ; หน้าหลังบ้านมี Sidebar/Header อย่างละหนึ่งชุด หน้า public/Customer มี Header หนึ่งชุด
ทดสอบ active state ของเมนู Admin/Manager/Seller และ Customer profile; รายละเอียดลูกค้าไม่มีเมนู ID สมมติ active
ลิงก์เก่า `/requests?car=Corolla%20Cross&type=จอง` เก็บรถและประเภทครบ บันทึกคำขอตัวอย่างได้ และ Admin ยังค้นหา ORD-0002 เปิดรายละเอียด/ปิดด้วย Escape ได้
หน้าโครงไม่ได้ทดสอบธุรกรรม/CRUD/การตรวจสิทธิ์ เพราะยังไม่มีฟังก์ชันเหล่านั้น

| Role     | หน้า                    | URL                             | Layout         | Feature / สถานะ             |
| -------- | ----------------------- | ------------------------------- | -------------- | --------------------------- |
| public   | หน้าแรก                 | `/`                             | AppLayout      | reporting / หน้าเดิม (demo) |
| public   | รายการรถ                | `/catalog`                      | AppLayout      | catalog / หน้าเดิม (demo)   |
| public   | โปรโมชัน                | `/promotions`                   | AppLayout      | catalog / หน้าโครง          |
| public   | ติดต่อเรา               | `/contact`                      | AppLayout      | sales / หน้าโครง            |
| public   | ล็อกอิน / สมัครสมาชิก   | `/login`                        | AppLayout      | identity / หน้าเดิม (demo)  |
| public   | สมัครสมาชิก             | `/register`                     | AppLayout      | identity / หน้าโครง         |
| customer | ส่งคำขอ                 | `/customer/requests`            | CustomerLayout | sales / หน้าเดิม (demo)     |
| customer | ประวัติธุรกรรม          | `/customer/transactions`        | CustomerLayout | payment / หน้าโครง          |
| customer | ประกันของฉัน            | `/customer/insurance`           | CustomerLayout | รอตกลงเจ้าของงาน / หน้าโครง |
| customer | โปรไฟล์                 | `/customer/profile`             | CustomerLayout | identity / หน้าโครง         |
| seller   | งานของฉัน               | `/seller/tasks`                 | SellerLayout   | sales / หน้าโครง            |
| seller   | รายละเอียดลูกค้า        | `/seller/customers/:customerId` | SellerLayout   | sales / หน้าโครง            |
| seller   | สร้างฟอร์มขาย           | `/seller/orders/new`            | SellerLayout   | sales / หน้าโครง            |
| seller   | นัดหมายของฉัน           | `/seller/appointments`          | SellerLayout   | sales / หน้าโครง            |
| seller   | ติดต่อการเงิน           | `/seller/finance`               | SellerLayout   | payment / หน้าโครง          |
| admin    | Dashboard               | `/admin`                        | AdminLayout    | reporting / หน้าเดิม (demo) |
| admin    | จัดการรถ                | `/admin/cars`                   | AdminLayout    | catalog / หน้าโครง          |
| admin    | จัดการโปรโมชัน          | `/admin/promotions`             | AdminLayout    | catalog / หน้าโครง          |
| admin    | กล่องคำขอลูกค้า         | `/admin/requests`               | AdminLayout    | sales / หน้าโครง            |
| admin    | จัดการผู้ใช้            | `/admin/users`                  | AdminLayout    | identity / หน้าโครง         |
| admin    | จัดการแพ็กเกจประกัน     | `/admin/insurance-packages`     | AdminLayout    | รอตกลงเจ้าของงาน / หน้าโครง |
| manager  | Dashboard               | `/manager`                      | ManagerLayout  | reporting / หน้าเดิม (demo) |
| manager  | มอบหมาย Seller          | `/manager/assignments`          | ManagerLayout  | sales / หน้าโครง            |
| manager  | อนุมัติธุรกรรม          | `/manager/approvals`            | ManagerLayout  | sales / หน้าโครง            |
| manager  | ออกบิลส่งการเงิน        | `/manager/invoices`             | ManagerLayout  | payment / หน้าโครง          |
| manager  | ภาพรวมนัดหมาย           | `/manager/appointments`         | ManagerLayout  | sales / หน้าโครง            |
| manager  | รายงานประกัน / referral | `/manager/reports/insurance`    | ManagerLayout  | reporting / หน้าโครง        |
