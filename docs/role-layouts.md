# Layout ของ Customer และ Manager

อัปเดตถัดมา: เพิ่ม Seller และ route โครงครบตาม Google Docs ดู [Page List routing](page-list-routing.md) สำหรับตาราง URL ปัจจุบัน ส่วนคำว่า “ยังไม่มีหน้า” ด้านล่างเป็นสถานะก่อนเพิ่มหน้าโครง

## เส้นทางที่เปิดได้

| URL                                         | Layout                          | เนื้อหา                                                     |
| ------------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| `/`, `/catalog`, `/catalog/:name`, `/login` | AppLayout → ShowroomLayout      | หน้า public เดิม                                            |
| `/customer`                                 | CustomerLayout → ShowroomLayout | ส่งต่อไป `/customer/requests`                               |
| `/customer/requests`                        | CustomerLayout → ShowroomLayout | RequestsPage เดิมจาก Sales พร้อมเมนูลูกค้า                  |
| `/requests`                                 | legacy redirect                 | ส่งต่อไป `/customer/requests` โดยเก็บ query string และ hash |
| `/manager`                                  | ManagerLayout → WorkspaceLayout | หน้าตั้งต้นผู้จัดการ ไม่มีตัวเลขหรือธุรกรรมสำเร็จปลอม       |
| `/admin`                                    | AdminLayout → WorkspaceLayout   | Dashboard เดิมพร้อมค้นหา/dialog/CSV                         |

ทุก parent role มี child `*` แสดง NotFoundPage ภายใต้ Layout ของตัวเองสำหรับหน้าที่ยังไม่มี
ส่วน `/identity`, `/sales`, `/payment`, `/reporting` ยังเป็น placeholder ใต้ AppLayout ตามเดิม ไม่เดาว่าเป็นหน้า Manager หรือ Customer

## ส่วนร่วมและ ownership

- `ShowroomLayout.jsx`: เมนูบน เมนูมือถือ footer และ Outlet ที่ใช้ร่วมระหว่าง AppLayout กับ CustomerLayout; prop `customer` เลือกชุดเมนูลูกค้า
- `WorkspaceLayout.jsx`: Sidebar/Header และ Outlet ที่ใช้ร่วมระหว่าง AdminLayout กับ ManagerLayout รับชื่อ role และรายการเมนูจาก wrapper ของแต่ละ role
- `AdminLayout.jsx` / `ManagerLayout.jsx`: กำหนด role และเมนูของตัวเอง Dashboard/ภาพรวมใช้ NavLink end เพื่อไม่ active ค้างบนหน้าลูกอื่น
- `ManagerPage.jsx`: หน้าเริ่มต้นส่วนกลาง อธิบายพื้นที่สำหรับมอบหมาย/อนุมัติที่ยังรอทีมพัฒนา ไม่สร้างฟังก์ชัน Sales หรือ Reporting แทนเพื่อน
- `features/sales/routes.jsx`: export `customerSalesRoutes` สำหรับ child path `requests`; ตำแหน่ง RequestsPage, state, validation และ sessionStorage เดิมไม่เปลี่ยน
- `PreserveLocationRedirect.jsx`: ส่งต่อ URL เก่าด้วย replace โดยคงข้อมูลรถ ประเภทคำขอ สี รุ่นย่อย และ hash

WorkspaceLayout ส่ง DOM target ของ toolbar ผ่าน Outlet context เช่นเดิม AdminPage ใช้ createPortal แสดงช่องค้นหาใน Header โดย search state ยังอยู่ใน Dashboard
Manager ยังไม่มีฟังก์ชันค้นหาที่ไม่มีข้อมูลรองรับ และไม่มีลิงก์มอบหมาย/อนุมัติจนกว่าหน้าจริงจะพร้อม
Header/Sidebar สร้างเพียงครั้งเดียวใน Layout หน้า feature ให้ส่งออกเฉพาะเนื้อหา

## เพิ่มหน้าของ Manager ภายหลัง

เมื่อเจ้าของ Sales มีหน้าจริงแล้ว ให้เพิ่มใน `features/sales/routes.jsx`:

```jsx
import AssignmentsPage from './pages/AssignmentsPage.jsx';
import ApprovalsPage from './pages/ApprovalsPage.jsx';

export const managerSalesRoutes = [
  { path: 'assignments', element: <AssignmentsPage /> },
  { path: 'approvals', element: <ApprovalsPage /> },
];
```

จากนั้น import `managerSalesRoutes` ใน `src/routes/index.jsx` แล้วเพิ่ม `...managerSalesRoutes` ใน `children` ของ parent `manager` ก่อน fallback `*`
จะได้ `/manager/assignments` และ `/manager/approvals` พร้อมโครงร่วมทันที เมื่อหน้าพร้อมจึงเพิ่มลิงก์ใน ManagerLayout
Feature อื่นเพิ่ม export ตาม role ในแบบเดียวกัน เช่น `customerPaymentRoutes` สำหรับหน้าประวัติลูกค้า ไม่ย้าย `paymentRoutes` ทั้งกลุ่มโดยเดาสิทธิ์

## ขอบเขต

นี่เป็น frontend demo ไม่มี Role Guard, JWT, Backend หรือการล็อกอินจริง การเปิด URL แยก role ไม่ใช่การตรวจสิทธิ์
ไม่ได้เพิ่ม dependencies หรือแก้ business logic ของ RequestsPage และไม่ได้สร้างระบบมอบหมาย/อนุมัติ/ประวัติชำระเงิน

## ผลตรวจ

- Build และ lint ของ repo ผ่าน
- Browser: `/requests?car=Corolla%20Cross&type=จอง&variant=Hybrid%20Premium&color=แดงสด` ส่งต่อไป `/customer/requests` พร้อมข้อมูลครบ
- บันทึกและยกเลิกคำขอตัวอย่างได้; กลับเข้าหน้า Customer ยังอ่าน sessionStorage เดิมได้
- Customer มี Header public หนึ่งชุด และไม่มี Header ของ Workspace ซ้อน
- Manager มี Sidebar/Header อย่างละหนึ่งชุด; `/manager/approvals` ที่ยังไม่มีหน้าแสดง NotFound และเมนูภาพรวมไม่ active ค้าง
- Admin ยังค้นหา ORD-0002 และเปิด/ปิดรายละเอียดด้วย Escape ได้หลังใช้ WorkspaceLayout ร่วม
- ตรวจที่ viewport 390 × 844: เมนูมือถือ Customer เปิดได้ ทั้ง Customer และ Manager ไม่มีเนื้อหาล้นแนวนอน
- ไม่พบ console error ระหว่างทดสอบ
- ภาพ: [Customer](customer-layout.png), [Manager](manager-layout.png)
