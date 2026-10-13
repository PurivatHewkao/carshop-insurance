# Admin Layout และ routes ของทีม

อัปเดตถัดมา: ปัจจุบันมี route โครงตาม Page List แล้ว ดู [Page List routing](page-list-routing.md) สำหรับรายการล่าสุด ส่วนผลตรวจด้านล่างบันทึกสถานะตอนแยก AdminLayout ครั้งแรก

ตรวจโค้ดวันที่ 13 ต.ค. 2569: ไม่พบ AGENTS.md ใน checkout หรือโฟลเดอร์แม่ที่ตรวจ

## โครงที่ใช้อยู่

`apps/web/src/layouts/AdminLayout.jsx` เป็นโครงร่วมของ `/admin`: Sidebar, Header, ข้อมูลบัญชีสาธิต และ `<Outlet />` แสดงหน้าลูก
หลังเพิ่ม Customer/Manager โครง Sidebar/Header/Outlet นี้ใช้ `WorkspaceLayout.jsx` ร่วมกับ Manager โดย AdminLayout ยังคงกำหนด role และเมนู Admin ของตัวเอง ดู [Role layouts](role-layouts.md)
`apps/web/src/pages/AdminPage.jsx` เป็น index page ของ `/admin` ดูแลข้อมูล Dashboard, search state, dialog และ CSV เหมือนเดิม
เมนู Dashboard ใช้ `NavLink` พร้อม `end` จึง active เฉพาะ `/admin` และไม่ active บน `/admin/payments`

Header มีช่องว่างสำหรับ toolbar โดยส่ง DOM target ผ่าน Outlet context หน้า Dashboard ใช้ `createPortal` แสดงช่องค้นหาของตัวเองในตำแหน่งเดิม
state และ event handler ของช่องค้นหายังคงอยู่ใน AdminPage; เมื่อออกจาก Dashboard ช่องค้นหาจะถูกถอดออกอัตโนมัติ
หน้าลูกทั่วไปไม่ต้องใช้ context หรือสร้าง Sidebar/Header ซ้ำ ให้ส่งออกเฉพาะเนื้อหาหน้า เช่น `<main className="page-content admin-content">…</main>`

มี child `*` สำหรับ URL Admin ที่ยังไม่มีหน้า จึงแสดง NotFoundPage ภายใต้โครง Admin โดยไม่สร้างฟังก์ชันของ feature แทนเจ้าของงาน
ยังไม่มี Payments page หรือ route `payments` จริง และไม่เพิ่มเมนูไปหน้าที่ยังไม่มี
ไม่มี Role Guard หรือการเปลี่ยนระบบยืนยันตัวตน/Backend ในงานนี้

## ผลตรวจ routes ทุก feature ในรอบแยก Admin (ก่อนเพิ่ม Customer/Manager)

| Feature   | Route / หน้าในปัจจุบัน                                                                                        | การจัด Layout                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Identity  | `/login` เป็นฟอร์ม Login ตัวอย่าง; `/identity` เป็น placeholder บัญชีผู้ใช้และสิทธิ์                          | ใช้ AppLayout เดิม; ยังไม่มีหน้าจัดการผู้ใช้ Admin ที่ระบุ role                   |
| Catalog   | `/catalog`, `/catalog/:name` เป็นหน้ารายการ/รายละเอียดรถ public; มี PlaceholderPage.jsx เก่าที่ไม่ได้ลง route | ใช้ AppLayout เดิม; ยังไม่มีหน้าจัดการรถ Admin                                    |
| Sales     | `/requests` เป็นคำขอลูกค้า; `/sales` เป็น placeholder งานขายและคำสั่งซื้อ                                     | ใช้ AppLayout เดิม; ยังไม่มีหน้าจัดการคำขอ Admin หรือหน้า Seller/Manager จริง     |
| Payment   | `/payment` เป็น placeholder การเงินและชำระเงินจำลอง                                                           | ใช้ AppLayout เดิม; ยังไม่มี `/admin/payments` และยังไม่ได้แยกหน้า Admin/Customer |
| Reporting | `/reporting` เป็น placeholder รายงานและ Dashboard                                                             | ใช้ AppLayout เดิม; ยังไม่มีหน้ารายงาน Admin ที่ระบุ role                         |
| กลาง      | `/admin` เป็น Dashboard ผู้ดูแลตัวอย่างใน src/pages/AdminPage.jsx                                             | ใช้ AdminLayout และ index route                                                   |

ชื่อ feature ไม่ได้ระบุ role: เช่น Payment อาจมีทั้งประวัติลูกค้าและหน้าฝ่ายการเงิน จึงไม่ย้าย placeholder ทั้ง feature เข้า AdminLayout โดยเดาสิทธิ์
จากโค้ดปัจจุบันไม่มีหน้า Admin เพิ่มเติมในทั้งห้า feature ให้ย้ายหรือเชื่อม และยังไม่มี route arrays สำหรับ Admin ของ feature เหล่านั้น
ตำแหน่งไฟล์ หน้า public และ feature exports เดิมคงอยู่ เมื่อเจ้าของงานสร้างหน้า Admin จริง ให้ export กลุ่มเฉพาะ Admin ตามตัวอย่างด้านล่าง

## ตัวอย่างสำหรับดิว: เพิ่ม `/admin/payments` เมื่อมีหน้าจริง

ตัวอย่างนี้เป็นคู่มือ ยังไม่ได้เพิ่ม PaymentsPage หรือแก้ feature ของดิว

ใน `apps/web/src/features/payment/routes.jsx` ให้คง `paymentRoutes` เดิม แล้วเพิ่ม export:

```jsx
import PaymentsPage from './pages/PaymentsPage.jsx';

export const adminPaymentRoutes = [
  { path: 'payments', element: <PaymentsPage /> },
];
```

ใน `apps/web/src/routes/index.jsx` ให้ import ทั้งสองกลุ่มตามการใช้งาน:

```jsx
import {
  paymentRoutes,
  adminPaymentRoutes,
} from '../features/payment/routes.jsx';

// ส่วน parent Admin ใน createBrowserRouter
{
  path: 'admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <AdminPage /> },
    ...adminPaymentRoutes,
    { path: '*', element: <NotFoundPage /> },
  ],
}
```

path แม่ `admin` + path ลูก `payments` ได้ URL `/admin/payments` ไม่ต้องเขียน `admin/` ซ้ำใน feature
ให้คง `...paymentRoutes` ใต้ AppLayout สำหรับ routes เดิมที่ไม่ได้ย้าย อย่าประกาศหน้า Admin เดียวกันทั้งสอง Layout
เมื่อหน้าจริงพร้อมแล้วจึงเพิ่มเมนู `/admin/payments` ใน AdminLayout; หน้ารายละเอียด เช่น `payments/:id` ใช้เมนู Payments แบบไม่ใส่ `end` เพื่อ active ต่อเนื่องได้
Identity, Catalog, Sales และ Reporting ใช้รูปแบบเดียวกัน เช่น `adminIdentityRoutes`, `adminCatalogRoutes`, `adminSalesRoutes`, `adminReportingRoutes` โดยแยกเฉพาะหน้า Admin จาก public/role อื่น

## ผลตรวจ Role อื่นในรอบแยก Admin

ตรวจ JSX ทุกหน้าและ layouts แล้วพบว่า Customer ใช้ AppLayout ซึ่งมีเมนูบน/footer ร่วม ส่วน RequestsPage, CarsPage, CarDetailPage และ LoginPage ไม่มี Sidebar/Header ของแอปซ้ำในหน้า
Header หัวข้อภายในหน้า เช่น `.s-ph` เป็นหัวเรื่องของเนื้อหา ไม่ใช่เมนูแอปที่ซ้ำ
ยังไม่มี ManagerLayout, SellerLayout หรือหน้า Dashboard ของ Manager/Seller จริง จึงยังไม่มีโครง Sidebar/Header ของ role เหล่านี้ให้แยก
เมื่อมีหน้าจริง ควรแยก ManagerLayout/SellerLayout พร้อม Outlet และแยก route exports ตาม role ภายในแต่ละ feature โดยคง business logic ไว้ในหน้า
รอบแยก Admin ไม่ได้แก้ Layout หรือ role อื่น ต่อมาได้เพิ่ม CustomerLayout และ ManagerLayout ตามคำขอใหม่ ดูโครงปัจจุบันและเส้นทาง `/customer/requests` ใน [Role layouts](role-layouts.md)

## ผลการตรวจหลังแยก Admin (ก่อนเพิ่ม Customer/Manager)

- `npm run build`: ผ่าน
- `npm run lint`: ผ่าน
- Browser `/admin`: Sidebar 1 ชุด, `.s-adm-top` Header 1 ชุด, ไม่มีเมนู public ซ้อน; KPI/กราฟ/ตารางเดิมยังแสดง
- ค้นหา `ORD-0002`: เหลือหนึ่งรายการ เปิด dialog ได้ และปิดด้วย Escape ได้
- CSV จากตัวกรองนี้ดาวน์โหลดสำเร็จ ตรวจไฟล์ได้ header และข้อมูล ORD-0002 เพียงรายการเดียว
- เปิด `/admin/payments` ตรง: แสดง NotFoundPage พร้อม Sidebar/Header อย่างละหนึ่งชุด, Dashboard ไม่มี aria-current และไม่มีช่องค้นหาของ Dashboard ค้าง
- `/catalog`, `/login`, `/requests`: ตรวจใน browser แล้วใช้ Header public หนึ่งชุด ไม่มี Sidebar/Header Admin
- กลับเข้า `/admin`: ช่องค้นหากลับมาและเริ่มว่างตามการ mount Dashboard ใหม่ ไม่พบ console error
- ภาพผลลัพธ์: [AdminLayout](admin-layout.png)

การตรวจนี้เป็น frontend demo ไม่ได้ตรวจ Role Guard, Backend หรือ Payments ที่ยังไม่มี
