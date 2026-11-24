# sales service — คนที่ 3 (เฟียร์)

รับผิดชอบ: งานขายและคำสั่งซื้อ ดูคู่มือหลัก [team ownership](../../docs/team-ownership.md)

## รันแยก

ใช้ Node.js 24 LTS: cd services/sales แล้ว npm install และ npm run dev (port 3003); npm start สำหรับรันโดยไม่ watch
คัดลอก .env.example เป็น .env เมื่อจะตั้งค่าฐานข้อมูล; health ทำงานได้แม้ไม่มี .env หรือ credentials
GET http://localhost:3003/api/v1/health ตอบ {"service":"sales","status":"ok"}; เป็น liveness ไม่รับรอง database

## ไฟล์ที่แก้และตำแหน่งเพิ่มงาน

- src/app.js: mount routes เมื่อ implement จริง; ห้ามเปิด port ที่นี่
- src/server.js: local listener; Vercel ใช้ default export จาก src/app.js
- src/config/env.js และ src/config/mysql.js: config และ lazy database connections
- src/modules/README.md: เพิ่ม module ของตัวเองเมื่อเริ่มงาน โดยแยก routes/controller/service/repository/validation ตามความจำเป็น
- src/middleware/actor.js: map Identity session ไปยัง customer/employee record; session และ role ตรวจผ่าน `packages/auth`
- database/README.md: แนวทาง migrations/models; src/utils/README.md: helper ของ service
- src/clients/README.md: ตำแหน่ง HTTP clients ของ dependencies
- package.json, package-lock.json, .env.example และ README.md: เจ้าของ service ดูแลเอง; ห้าม commit .env

## ลำดับเริ่มงาน

Orders, Appointments, Assignments และ Approval flow เชื่อมกับฐานข้อมูลแล้ว; การตรวจ session และ role ใช้ Identity service

ประสานคนที่ 5 (อั้ม) ก่อนแก้ tooling หรือ contract กลาง และประสานเจ้าของ service ที่เกี่ยวข้องก่อนเปลี่ยน API
ก่อนส่ง integrate: อัปเดต OpenAPI/contract, validation/auth ตามที่ตกลง, tests กรณีสำเร็จและผิดพลาด, .env.example และคู่มือ; health/lint/build ต้องผ่าน ไม่มี success ปลอม
เจ้าของ service ต้องเชื่อมและแก้ปัญหาของตัวเอง คนที่ 5 (อั้ม) ประสาน integration ไม่ทำแทนทุกคน

## ฐานข้อมูลและ API ที่ implement แล้ว

ใช้ฐานข้อมูล `carshop_sql` จาก `db schema/01_mysql_schema.sql` (ตั้ง `MYSQL_DATABASE=carshop_sql` ใน .env ไม่ใช่ carshop_sales)
จากนั้นเลือก schema เป้าหมายให้ถูก (`carshop_sql` local หรือ `railway` บน Railway) แล้วรัน `services/sales/database/03_sales_columns.sql` และ `services/sales/database/04_order_configuration.sql` (รันซ้ำได้) เพื่อเพิ่มคอลัมน์ workflow ใบจอง, สเปกรุ่น/รุ่นย่อย/สี/ล้อ, เงินดาวน์, ดอกเบี้ย, จำนวนงวดและปีผ่อน รวมถึงสเปกที่เลือกในคำขอนัดหมาย

ทุก response เป็น `{ "data": ... }`; error เป็น `{ "error": { "code", "message" } }` Base URL: `http://localhost:3003/api/v1`
รายละเอียด request/response, roles, cookie/Bearer security และ error statuses อยู่ใน [OpenAPI spec](./openapi.yaml)

| Method | Path | ใช้ทำอะไร |
| ------ | ---- | --------- |
| GET | /lookups/cars, /customers, /sellers, /insurances | ข้อมูล dropdown (cars คืนเฉพาะคันว่างที่ไม่มี order ค้าง) |
| GET | /lookups/actor | หา customerId/employeeId ของผู้ใช้จาก session ที่ยืนยันแล้ว |
| GET | /lookups/customers/:id | ดูข้อมูลลูกค้าที่เกี่ยวข้องกับ Seller ที่ login อยู่; Manager/Admin ดูลูกค้าที่ active ได้ |
| GET | /appointments?customerId=&sellerId=&status= | รายการนัดหมาย; customer/seller ถูกจำกัดเป็นของตนเอง |
| POST | /appointments | Customer สร้างนัดหมาย; customerId มาจาก session (carId, appointmentType, appointmentDate, appointmentTime, note) |
| PATCH | /appointments/:id/assign | Manager/Admin มอบหมาย Seller (sellerId, note); assignedBy มาจาก session |
| PATCH | /appointments/:id/status | Seller รับ/ปิดงานของตนเอง; Customer ยกเลิกคำขอของตนเอง |
| DELETE | /appointments/:id | Admin ลบคำขอ |
| GET | /orders?customerId=&sellerId=&status= | รายการ order; customer/seller ถูกจำกัดเป็นของตนเอง |
| POST | /orders | Seller สร้าง order; sellerId มาจาก session (customerId, carId, insuranceId?, discount?, note?) |
| PATCH | /orders/:id/decision | Manager/Admin อนุมัติหรือปฏิเสธ (decision, comment) |

กติกาสำคัญ: เงินคำนวณเป็น satang (BigInt) ฝั่ง server; รถ 1 คันมี order ที่ไม่ถูกยกเลิกได้ 1 ใบ (uq_orders_active_car → 409 CAR_ALREADY_ORDERED);
APPROVED → orders.status=CONFIRMED และ cars.status=RESERVED; REJECTED → orders.status=CANCELLED
สถานะของคำขอ/งานที่หน้า UI ใช้ (ASSIGNED, IN_PROGRESS) คำนวณจาก appointments.status + seller_id

## Authentication และสิทธิ์

ทุก endpoint ยกเว้น `GET /health` ต้องมี Identity session cookie หรือ Bearer token; Sales เรียก `GET /users/me` ผ่าน `packages/auth` เพื่อตรวจ JWT, revocation, สถานะบัญชี และ role ล่าสุด การเขียนด้วย cookie ต้องมี Origin ที่อยู่ใน `CORS_ORIGINS`. ตั้ง `IDENTITY_API_URL` (ค่าเริ่มต้น `http://localhost:3001/api/v1`) และเปิด Identity service ก่อนเรียก business API. Customer/Seller lists ถูกกรองตามผู้ใช้ที่ยืนยันแล้ว; body/query ไม่สามารถเลือก actor แทนได้.

## ตรวจการทำงาน

รัน `npm test` ในโฟลเดอร์นี้เพื่อทดสอบ session, role, Origin/CSRF, CORS preflight และ health โดยใช้ Identity จำลองและไม่เชื่อมฐานข้อมูล. รัน lint และ frontend build จาก root ด้วย `npm run lint` และ `npm run build`.
