# payment service — คนที่ 4 (ดิว)

รับผิดชอบ: การเงินและชำระเงินจำลอง / ใบแจ้งหนี้ / คืนเงิน ดูคู่มือหลัก [team ownership](../../docs/team-ownership.md)
Endpoint อิงแท็บ **API** ใน Google Doc "Car Shop" (Car Shop — API Design) ส่วน Payments / Refunds / Invoices

## รันแยก

1. Node.js 24: `cd services/payment` แล้ว `npm install`
2. คัดลอก `.env.example` เป็น `.env` แล้วใส่ `MYSQL_USER` / `MYSQL_PASSWORD` (ห้าม commit .env)
3. สร้างฐานข้อมูลกลางครั้งแรก: `mysql -u <user> -p < "db schema/01_mysql_schema.sql"` (จาก root ของ repo)
4. เพิ่มตารางของ payment: `npm run db:migrate` (รันซ้ำได้ ใช้ `CREATE TABLE IF NOT EXISTS`)
5. `npm run dev` (port 3004) หรือ `npm start`
6. ทดสอบ: `npm test` — สร้างฐาน `carshop_payment_test` ใหม่ทุกครั้งจาก schema กลาง + migrations แล้วยิง API จริง (ไม่แตะ `carshop_sql`)

`GET /api/v1/health` ตอบ `{"service":"payment","status":"ok"}` ได้แม้ไม่มี .env

## ฐานข้อมูล

- ใช้ MySQL `carshop_sql` ร่วมกับทีม (ไฟล์ของโจเซฟ `db schema/01_mysql_schema.sql`) — ตาราง `payments`, `invoices`
- `database/migrations/001_refunds_and_idempotency.sql` เพิ่ม 2 ตาราง (ไม่แก้ตารางเดิม):
  - `refunds` — ตาราง refund ที่ API Design เสนอ (ไม่มีใน schema กลาง)
  - `payment_idempotency_keys` — เก็บ Idempotency-Key เพื่อกันจ่าย/ขอคืนซ้ำ
- **ชั่วคราว:** `src/clients/orders.js` อ่าน/แก้ `orders` (ของเฟียร์) และ `cars` (ของกร) ตรงในฐานเดียวกัน
  จนกว่า Sales จะมี order API — โค้ดข้าม service อยู่ไฟล์นี้ไฟล์เดียว

## รูปแบบ

- JSON camelCase แบบเดียวกับ catalog, enum ตัวพิมพ์ใหญ่ตรงกับฐานข้อมูล, เงินเป็น string `"1250000.00"` (คำนวณเป็นสตางค์ ไม่ใช้ float), เวลา ISO UTC
- สำเร็จ: `{ "data": ..., "meta": { page, limit, total } }` · ผิดพลาด: `{ "error": { code, message, details? } }`
- POST สร้าง payment / refund ต้องส่ง header `Idempotency-Key` (8–100 ตัว) — ยิงซ้ำ key เดิม + body เดิม ได้ผลเดิม (header `Idempotent-Replayed: true`), key เดิม body ต่าง = 422

## Endpoints (base `http://localhost:3004/api/v1`)

| Method | Path                                                          | ใช้โดย (ตาม Doc)                | หน้าที่                                                                                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/orders/{orderId}/payments`                                  | Customer, Seller                | `{ amount, paymentMethod: CASH\|BANK_TRANSFER\|CREDIT_CARD, transactionReference? }` order ต้อง `CONFIRMED`, ยอดต้องไม่เกินยอดค้าง. CREDIT_CARD = จำลองสำเร็จทันที (`SUCCESS`), CASH/BANK_TRANSFER = `PENDING` รอ Admin; BANK_TRANSFER ต้องมีเลขอ้างอิง |
| GET    | `/orders/{orderId}/payments`                                  | เจ้าของ, Seller, Admin, Manager | ประวัติ + `summary` (totalAmount, paidAmount, pendingAmount, refundedAmount, outstandingAmount)                                                                                                                                                         |
| GET    | `/payments`                                                   | Admin, Manager                  | กรอง `status`, `paymentMethod`, `dateFrom`, `dateTo` (YYYY-MM-DD), `page`, `limit`                                                                                                                                                                      |
| GET    | `/payments/{id}`                                              |                                 | รายละเอียด                                                                                                                                                                                                                                              |
| PATCH  | `/payments/{id}`                                              | Admin                           | `{ status: SUCCESS\|FAILED }` เฉพาะ `PENDING`                                                                                                                                                                                                           |
| POST   | `/payments/{paymentId}/refunds`                               | Customer, Seller, Admin         | `{ amount, reason }` payment ต้อง `SUCCESS`, ไม่เกินยอดที่ยังไม่คืน, ค้างขอได้ทีละ 1                                                                                                                                                                    |
| GET    | `/orders/{orderId}/refunds`                                   |                                 | ประวัติคืนเงินของ order                                                                                                                                                                                                                                 |
| GET    | `/refunds` · `/refunds/{id}`                                  | Admin, Manager                  | กรอง `status` (REQUESTED\|REFUNDED\|REJECTED), `dateFrom`, `dateTo`                                                                                                                                                                                     |
| POST   | `/refunds/{id}/approve`                                       | Admin                           | `{ refundReference }` → `REFUNDED`                                                                                                                                                                                                                      |
| POST   | `/refunds/{id}/reject`                                        | Admin                           | `{ reason }` → `REJECTED`                                                                                                                                                                                                                               |
| POST   | `/orders/{orderId}/invoices`                                  | Seller, Admin                   | `{ issuedBy (employee id), dueDate? }` ยอด = total ของ order, order ต้อง `CONFIRMED`/`PAID`, มีใบที่ไม่ยกเลิกได้ใบเดียว                                                                                                                                 |
| GET    | `/orders/{orderId}/invoices` · `/invoices` · `/invoices/{id}` |                                 | `/invoices` กรอง `status` (ISSUED\|PAID\|CANCELLED)                                                                                                                                                                                                     |
| POST   | `/invoices/{id}/cancel`                                       | Admin                           | ยกเลิกได้เฉพาะ `ISSUED`                                                                                                                                                                                                                                 |

### กฎสถานะที่ทำอัตโนมัติ (ตาม "Order status และกฎทางธุรกิจ" ใน Doc)

- ยอด `SUCCESS` สุทธิครบ total → order `CONFIRMED` → `PAID` และ invoice `ISSUED` → `PAID`
- คืนเงินครบยอด payment → payment `REFUNDED`; คืนรวมครบ total ของ order → order `CANCELLED`, รถ `AVAILABLE`, invoice `CANCELLED`
- คืนบางส่วน: payment / order คงสถานะเดิม

## ยังไม่ทำ (รอทีม)

- Auth/role: ยังไม่ตรวจสิทธิ์ เพราะ Identity ยังไม่มี API ออก JWT (ไม่ทำ middleware หลอก); `requestedBy`/`reviewedBy` ของ refund จึงเป็น null และ invoice รับ `issuedBy` จาก body ชั่วคราว
- `GET /me/refunds`, `GET /me/invoices` (ต้องรู้ผู้ล็อกอิน), `GET /invoices/{id}/pdf`
- เปลี่ยน `src/clients/orders.js` ไปเรียก Sales API เมื่อเฟียร์พร้อม
- Frontend `apps/web/src/features/payment` ยังใช้ `mockPaymentApi.js` — ขั้นถัดไปเปลี่ยนไปเรียก `paymentClient`
