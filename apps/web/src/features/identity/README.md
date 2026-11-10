# Identity frontend

ค่าเริ่มต้นใช้ Identity API ที่ VITE_IDENTITY_API_URL หรือ http://localhost:3001/api/v1

- /register สมัคร Customer และเข้าสู่ระบบ
- /login เข้าสู่ระบบด้วย JWT
- /customer/profile โปรไฟล์ลูกค้า
- /account โปรไฟล์ทุกบทบาทและ Logout
- /admin/users Admin ดู/ค้นหา/สร้างผู้ใช้ เปลี่ยน role และระงับ/เปิดใช้บัญชี

Roles รองรับ customer, seller, manager, admin, finance, stock Login ส่ง Seller ไป /seller/tasks, Manager ไป /manager, Admin ไป /admin/users และ Finance/Stock ไป /account

RequireRole ป้องกัน parent routes Customer/Seller/Manager/Admin และตรวจโปรไฟล์กับ Backend เมื่อเข้าพื้นที่นั้น API ตรวจสิทธิ์เองทุก request การตรวจหน้าเว็บไม่แทนการตรวจ API ของ feature อื่น

JWT และ session เก็บใน memory รีเฟรชต้อง Login ใหม่ บัญชีอยู่ใน MySQL ใช้ VITE_IDENTITY_MODE=demo เพื่อเปิดข้อมูลสาธิตเดิมโดยชัดแจ้ง การสร้างผู้ใช้ใหม่ต้องใช้ API

รัน npm run dev:identity และ npm run dev:web จาก root ทดสอบครบด้วย npm --prefix services/identity test ซึ่งสร้าง MySQL ชั่วคราวและรัน headless Edge

GET users ตอบรายการทั้งหมดสำหรับ filtering ใน UI ในเวอร์ชันนี้ ดู contract และการตั้งค่า Admin ใน services/identity/README.md
