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
- src/middleware/errors.js: error และ 404 handlers; เพิ่ม auth middleware เมื่อ Identity contract พร้อม
- database/README.md: แนวทาง migrations/models; src/utils/README.md: helper ของ service
- src/clients/README.md: ตำแหน่ง HTTP clients ของ dependencies
- package.json, package-lock.json, .env.example และ README.md: เจ้าของ service ดูแลเอง; ห้าม commit .env

## ลำดับเริ่มงาน

1. พัฒนา Orders, Order items และสถานะก่อน โดยตกลง snapshot ราคาและ idempotency
2. พัฒนา Appointments และ Assignments พร้อมประสาน Identity/Catalog
3. พัฒนา Approval flow สำหรับ Manager
4. เชื่อม Seller, คำขอลูกค้า และหน้าติดตาม Order

ประสานคนที่ 5 (อั้ม) ก่อนแก้ tooling หรือ contract กลาง และประสานเจ้าของ service ที่เกี่ยวข้องก่อนเปลี่ยน API
ก่อนส่ง integrate: อัปเดต OpenAPI/contract, validation/auth ตามที่ตกลง, tests กรณีสำเร็จและผิดพลาด, .env.example และคู่มือ; health/lint/build ต้องผ่าน ไม่มี success ปลอม
เจ้าของ service ต้องเชื่อมและแก้ปัญหาของตัวเอง คนที่ 5 (อั้ม) ประสาน integration ไม่ทำแทนทุกคน

## ฐานข้อมูลและ API ที่ implement แล้ว

ใช้ฐานข้อมูล `carshop_sql` จาก `db schema/01_mysql_schema.sql` (ตั้ง `MYSQL_DATABASE=carshop_sql` ใน .env ไม่ใช่ carshop_sales)
จากนั้นรัน `services/sales/database/03_sales_columns.sql` หนึ่งครั้ง (รันซ้ำได้) เพื่อเพิ่มคอลัมน์ใน orders: insurance_id, insurance_premium, approval_status, manager_comment, note

ทุก response เป็น `{ "data": ... }`; error เป็น `{ "error": { "code", "message" } }` Base URL: `http://localhost:3003/api/v1`

| Method | Path | ใช้ทำอะไร |
| ------ | ---- | --------- |
| GET | /lookups/cars, /customers, /sellers, /insurances | ข้อมูล dropdown (cars คืนเฉพาะคันว่างที่ไม่มี order ค้าง) |
| GET | /lookups/actor?userId= , /lookups/employees?role= | หา customerId/employeeId จาก user (ดูหมายเหตุ auth) |
| GET | /appointments?customerId=&sellerId=&status= | รายการนัดหมาย (หน้าลูกค้า / Seller / Admin / Manager) |
| POST | /appointments | ลูกค้าสร้างนัดหมาย (customerId, carId, appointmentType VIEW_CAR/TEST_DRIVE, appointmentDate, appointmentTime, note) |
| PATCH | /appointments/:id/assign | Manager มอบหมาย Seller (sellerId, assignedBy) สร้างแถวใน assignments |
| PATCH | /appointments/:id/status | CONFIRMED (Seller รับงาน) / COMPLETED / CANCELLED ตาม transition ที่อนุญาต |
| DELETE | /appointments/:id | Admin ลบคำขอ |
| GET | /orders?customerId=&sellerId=&status= | รายการ order (status = PENDING_APPROVAL / APPROVED / REJECTED) |
| POST | /orders | Seller สร้าง order (customerId, sellerId, carId, insuranceId?, discount?, note?) ราคารถและเบี้ยประกันอ่านจาก DB ใน transaction |
| PATCH | /orders/:id/decision | Manager อนุมัติ/ไม่อนุมัติ (decision, comment) |

กติกาสำคัญ: เงินคำนวณเป็น satang (BigInt) ฝั่ง server; รถ 1 คันมี order ที่ไม่ถูกยกเลิกได้ 1 ใบ (uq_orders_active_car → 409 CAR_ALREADY_ORDERED);
APPROVED → orders.status=CONFIRMED และ cars.status=RESERVED; REJECTED → orders.status=CANCELLED
สถานะของคำขอ/งานที่หน้า UI ใช้ (ASSIGNED, IN_PROGRESS) คำนวณจาก appointments.status + seller_id

**หมายเหตุ auth:** ยังไม่มี Identity backend จึงยังไม่มีการตรวจ token/role ใน sales API ทุก endpoint เปิดให้เรียกได้ ต้องเพิ่ม auth middleware ก่อนใช้งานจริง
