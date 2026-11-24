# payment service — คนที่ 4 (ดิว)

รับผิดชอบ: การเงินและชำระเงินจำลอง / ใบแจ้งหนี้ / คืนเงิน / ติดต่อการเงิน ดูคู่มือหลัก [team ownership](../../docs/team-ownership.md)
Endpoint อิงแท็บ **API** ใน Google Doc "Car Shop" (Car Shop — API Design) ส่วน Payments / Refunds / Invoices

## รันแยก (ทำครั้งแรกตามลำดับ — UAT 11 พ.ย. ได้ HTTP 500 เพราะข้ามข้อ 2 และ 4)

1. Node.js 24: `cd services/payment` แล้ว `npm install`
2. คัดลอก `.env.example` เป็น `.env` แล้วใส่ `MYSQL_USER` / `MYSQL_PASSWORD` (ห้าม commit .env)
3. สร้างฐานข้อมูลกลางครั้งแรก: `mysql -u <user> -p < "db schema/01_mysql_schema.sql"` (จาก root ของ repo)
4. เพิ่มตารางของ payment: `npm run db:migrate` (รันซ้ำได้ ใช้ `CREATE TABLE IF NOT EXISTS`)
5. เปิด Identity (port 3001) ก่อน เพราะทุก endpoint ยกเว้น health ตรวจ session ผ่าน Identity
6. `npm run dev` (port 3004) หรือ `npm start` — ถ้า DB ยังไม่พร้อมหรือขาดตาราง จะพิมพ์บอกใน console ตอนเปิด
7. ทดสอบ: `npm test` — สร้างฐาน `carshop_payment_test` ใหม่ทุกครั้งจาก schema กลาง + migrations, จำลอง Identity ในเทสต์ แล้วยิง API จริง (ไม่แตะ `carshop_sql`)

`GET /api/v1/health` ตอบ `{"service":"payment","status":"ok"}` ได้แม้ไม่มี .env

## Login และสิทธิ์

- ใช้ตัวกลาง `packages/auth` (ของโจเซฟ) — `src/middleware/auth.js` ติดไว้กับทุก route ใต้ `/api/v1` ยกเว้น `/health`
- รับ cookie session ของ Identity (เว็บส่ง `withCredentials`) หรือ `Authorization: Bearer <token>`; ไม่ login = 401, role ไม่ตรง = 403
- `users.id` ของผู้ login ถูกแปลงเป็น `customers.id` / `employees.id` แล้วกรองข้อมูลที่ backend:
  - **customer** เห็น/จ่าย/ขอคืนเงิน เฉพาะออเดอร์ของตัวเอง (ของคนอื่นตอบ 404 เหมือนไม่มี)
  - **seller** เห็นและออกบิลเฉพาะออเดอร์ที่ตัวเองเป็นผู้ขาย
  - **manager** เห็นทั้งหมด ออก/ยกเลิกบิลได้
  - **admin, finance** (ฝ่ายการเงิน) เห็นทั้งหมด ยืนยันยอดโอน รับเงินสด อนุมัติ/ปฏิเสธคืนเงิน ตอบเรื่องจากฝ่ายขาย
  - stock เห็นรายการว่าง
- ผู้ทำรายการบันทึกจาก session เสมอ: `invoices.issued_by`, `refunds.requested_by/reviewed_by`, `finance_requests.created_by/replied_by` (ค่าใน body ไม่ถูกเชื่อ)

## ฐานข้อมูล

- ใช้ MySQL `carshop_sql` ร่วมกับทีม (ไฟล์ของโจเซฟ `db schema/01_mysql_schema.sql`) — ตาราง `payments`, `invoices`
- `database/migrations/001_refunds_and_idempotency.sql` — `refunds`, `payment_idempotency_keys`
- `database/migrations/002_finance_requests.sql` — `finance_requests` (Seller ส่งเรื่องถึงการเงิน / การเงินตอบ)
- `database/migrations/003_payment_type_finance.sql` — `payments.payment_type`, `payments.finance_company`, วิธีจ่าย `FINANCE` (รันซ้ำได้)
- `src/clients/orders.js` อ่าน/แก้ `orders` (ของเฟียร์) และ `cars` (ของกร) ตรงในฐานเดียวกัน และอ่านชื่อจาก `customers`/`employees`
  — โค้ดข้าม service อยู่ไฟล์นี้ไฟล์เดียว (Sales API ตอนนี้ยังไม่ตรวจ login จึงยังไม่เรียกผ่าน HTTP)

## รูปแบบ

- JSON camelCase แบบเดียวกับ catalog, enum ตัวพิมพ์ใหญ่ตรงกับฐานข้อมูล, เงินเป็น string `"1250000.00"` (คำนวณเป็นสตางค์ ไม่ใช้ float), เวลา ISO UTC
- สำเร็จ: `{ "data": ..., "meta": { page, limit, total } }` · ผิดพลาด: `{ "error": { code, message, details? } }`
- POST สร้าง payment / refund ต้องส่ง header `Idempotency-Key` (8–100 ตัว) — ยิงซ้ำ key เดิม + body เดิม ได้ผลเดิม (header `Idempotent-Replayed: true`), key เดิม body ต่าง (หรือคนละผู้ใช้) = 422

## Endpoints (base `http://localhost:3004/api/v1`)

| Method | Path                                                          | Role                                        | หน้าที่                                                                                                                                                                                                                         |
| ------ | ------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/order-balances`                                             | ทุก role (กรองตามสิทธิ์)                    | ออเดอร์ + ชื่อลูกค้า/ผู้ขาย + รถ + ยอด paid/pending/refunded/outstanding (ใช้กับหน้าการเงินทั้ง 4 หน้า) กรอง `status`                                                                                                           |
| POST   | `/orders/{orderId}/payments`                                  | customer (ของตัวเอง), admin, finance        | `{ amount, paymentMethod, paymentType?, transactionReference?, financeCompany? }` order ต้อง `CONFIRMED`. CREDIT_CARD = จำลองสำเร็จทันที (รวมไม่เกิน 100,000/ออเดอร์), BANK_TRANSFER = `PENDING` รอการเงิน (ต้องมีเลขอ้างอิง), CASH = การเงินบันทึกที่โชว์รูม สำเร็จทันที, FINANCE = การเงินบันทึกยอดจัดที่ไฟแนนซ์โอนมา (ต้องมีเลขสัญญา + `financeCompany`) — CASH/FINANCE ลูกค้าใช้ไม่ได้ |
| GET    | `/orders/{orderId}/payments`                                  | ตามสิทธิ์                                   | ประวัติ + `summary` (outstanding เป็น 0 เมื่อ order ปิดแล้ว PAID/COMPLETED/CANCELLED)                                                                                                                                           |
| GET    | `/payments` · `/payments/{id}`                                | ตามสิทธิ์                                   | กรอง `status`, `paymentMethod`, `paymentType`, `dateFrom`, `dateTo`, `page`, `limit`                                                                                                                                            |
| PATCH  | `/payments/{id}`                                              | admin, finance                              | `{ status: SUCCESS\|FAILED }` เฉพาะ `PENDING`                                                                                                                                                                                   |
| GET    | `/payments/{id}/receipt`                                      | ตามสิทธิ์ (เหมือน `/payments/{id}`)         | ใบเสร็จรับเงิน A4 PDF (เลขที่ `RC-YYYYMMDD-XXXXXX`, แยก VAT, จำนวนเงินเป็นตัวอักษรไทย) เฉพาะยอด `SUCCESS`/`REFUNDED` อื่น ๆ = 409 `RECEIPT_NOT_AVAILABLE`                                                                        |
| GET    | `/orders/{orderId}/booking-document`                          | ตามสิทธิ์ (เหมือนออเดอร์)                   | ใบจองรถยนต์ A4 PDF (`BK-YYYYMMDD-XXXXXX`) ขั้นที่ 2: เงินจอง/เงินดาวน์ที่ต้องจ่ายเพิ่ม/ยอดจัดไฟแนนซ์ ให้ลูกค้ายื่นขอสินเชื่อ ออกได้หลังอนุมัติ + ได้รับเงินจอง อื่น ๆ = 409 `BOOKING_DOCUMENT_NOT_AVAILABLE` |
| GET    | `/financing/quote`                                            | **ไม่ต้อง login**                           | ประมาณค่างวดผ่อน `?price=&downPercent=(0–90)&months=(12…84)&annualRate=(0–20, ค่าเริ่ม 2.49)` ดอกเบี้ยคงที่ (flat) ค่างวดปัดขึ้นเป็นบาท + ตาราง `terms` ทุกระยะผ่อน                                                                |
| POST   | `/payments/{paymentId}/refunds`                               | customer (ของตัวเอง), admin, finance        | `{ amount, reason }` payment ต้อง `SUCCESS`, ไม่เกินยอดที่ยังไม่คืน, ค้างขอได้ทีละ 1                                                                                                                                            |
| GET    | `/orders/{orderId}/refunds` · `/refunds` · `/refunds/{id}`    | ตามสิทธิ์                                   | กรอง `status` (REQUESTED\|REFUNDED\|REJECTED), `dateFrom`, `dateTo`                                                                                                                                                             |
| POST   | `/refunds/{id}/approve` · `/refunds/{id}/reject`              | admin, finance                              | `{ refundReference }` → `REFUNDED` · `{ reason }` → `REJECTED`                                                                                                                                                                  |
| POST   | `/orders/{orderId}/invoices`                                  | seller (ของตัวเอง), manager, admin, finance | `{ dueDate? }` ยอด = total ของ order, order ต้อง `CONFIRMED`/`PAID`, มีใบที่ไม่ยกเลิกได้ใบเดียว                                                                                                                                 |
| GET    | `/orders/{orderId}/invoices` · `/invoices` · `/invoices/{id}` | ตามสิทธิ์                                   | `/invoices` กรอง `status` (ISSUED\|PAID\|CANCELLED)                                                                                                                                                                             |
| POST   | `/invoices/{id}/cancel`                                       | manager, admin, finance                     | ยกเลิกได้เฉพาะ `ISSUED`                                                                                                                                                                                                         |
| GET    | `/invoices/{id}/pdf`                                          | ตามสิทธิ์ (เหมือน `/invoices/{id}`)         | ใบแจ้งหนี้ A4 ภาษาไทย (`application/pdf`) สร้างด้วย pdfkit + ฟอนต์ Sarabun ใน `assets/fonts` (OFL) มีผู้ซื้อ รถ ยอดชำระ/คืน/คงค้าง และประวัติชำระ                                                                               |
| GET    | `/me/invoices` · `/me/refunds`                                | customer                                    | ใบแจ้งหนี้ / คำขอคืนเงินของลูกค้าที่ login (query เหมือน `/invoices`, `/refunds`)                                                                                                                                               |
| POST   | `/finance-requests`                                           | seller (ออเดอร์ของตัวเอง)                   | `{ orderId, topic, message }`                                                                                                                                                                                                   |
| GET    | `/finance-requests`                                           | seller (ของตัวเอง), manager, admin, finance | กรอง `status` (OPEN\|DONE)                                                                                                                                                                                                      |
| POST   | `/finance-requests/{id}/reply`                                | admin, finance                              | `{ reply }` → `DONE`                                                                                                                                                                                                            |

### ประเภทเงิน (`paymentType`) — ซื้อรถจริงไม่ได้จ่ายก้อนเดียว

- ซื้อสด: `BOOKING_DEPOSIT` (เงินจอง) → `BALANCE` (ชำระยอด)
- ผ่อน: `BOOKING_DEPOSIT` → `DOWN_PAYMENT` (เงินดาวน์) → `FINANCE_DISBURSEMENT` (ไฟแนนซ์โอนยอดจัด, คู่กับ `paymentMethod: FINANCE` เท่านั้น)
- ไม่ส่ง `paymentType` = `BALANCE` (FINANCE = `FINANCE_DISBURSEMENT`) · เงินจองมีได้ 1 ก้อนและต้องเป็นยอดแรก (409) · ยอดจัดไฟแนนซ์มีได้ 1 ก้อน (409)
- **ทุกยอดต้องรอผู้จัดการอนุมัติ (order `CONFIRMED`) ก่อน** · ระหว่าง `PENDING` = 409 `ORDER_NOT_PAYABLE` · เงินจองไม่เกิน `BOOKING_DEPOSIT_MAX` (ค่าเริ่ม 50,000) เกิน = 422 `DEPOSIT_TOO_HIGH`

### ขั้นตอนการซื้อ (`flow`) — `src/modules/payments/flow.js`

ออเดอร์ที่มี `installment_count > 0` (ทุกออเดอร์จากฟอร์มเซลส์) = **ซื้อผ่อน 4 ขั้น** หลังผู้จัดการอนุมัติ:

1. `BOOKING_DEPOSIT` ลูกค้าจ่ายเงินจอง
2. `FINANCE_APPLICATION` ดาวน์โหลดใบจอง (`/orders/{id}/booking-document`) ไปยื่นไฟแนนซ์เอง (นอกระบบ)
3. `DOWN_PAYMENT` กลับมาจ่ายเงินดาวน์ **เต็มจำนวนครั้งเดียว** = `orders.down_payment` − เงินจอง ต้องส่ง `financeCompany` (บริษัทที่อนุมัติ) · ยอดไม่ตรง = 422 `DOWN_PAYMENT_MUST_BE_FULL` (details.expected) · จ่ายซ้ำ = 409 `DOWN_PAYMENT_EXISTS` · เงินจองครอบคลุมดาวน์แล้ว = 409 `DOWN_PAYMENT_NOT_REQUIRED`
4. `DELIVERY` ไฟแนนซ์โอนยอดจัด (`FINANCE_DISBURSEMENT`, ต้องรถ READY) → order `PAID` → Catalog `PATCH /production/cars/{id} {action: DELIVER}` (ต้อง order `PAID`) → รถ `SOLD` + order `COMPLETED`

ลำดับบังคับ: ยอดอื่นก่อนเงินจอง `SUCCESS` = 409 `BOOKING_DEPOSIT_REQUIRED` / `BOOKING_DEPOSIT_NOT_CONFIRMED` · ยอดจัด/ยอดที่เหลือก่อนเงินดาวน์ `SUCCESS` = 409 `DOWN_PAYMENT_REQUIRED`
ออเดอร์ไม่มีงวดผ่อน = ซื้อเงินสด 3 ขั้น (`BOOKING_DEPOSIT` → `BALANCE` → `DELIVERY`) ห้ามใช้ `DOWN_PAYMENT` (422 `DOWN_PAYMENT_NOT_IN_PLAN`)
`GET /orders/{id}/payments` และ `GET /order-balances` มี `flow` = { plan, currentStep (0 = รออนุมัติ), completed, steps[{key,done}], bookingDeposit, bookingDocumentAvailable, downPayment{agreedAmount, depositDeducted, dueAmount, status}, finance{amount, received, …}, car{ready, delivered} }
- บัตรเครดิตรวมต่อออเดอร์ไม่เกิน `CREDIT_CARD_MAX_PER_ORDER` (ค่าเริ่ม 100,000) เกิน = 422 `CARD_LIMIT_EXCEEDED`
- ราคารวม VAT 7% แล้ว: invoice ส่ง `amountBeforeVat` + `vatAmount` และ PDF แยกรายการ รถ / ประกัน / ส่วนลด / VAT

### กฎสถานะที่ทำอัตโนมัติ (ตาม "Order status และกฎทางธุรกิจ" ใน Doc)

- ยอด `SUCCESS` สุทธิครบ total → order `CONFIRMED` → `PAID` และ invoice `ISSUED` → `PAID`
- คืนเงินครบยอด payment → payment `REFUNDED`; คืนรวมครบ total ของ order → order `CANCELLED`, รถ `AVAILABLE`, invoice `CANCELLED`
- คืนบางส่วน: payment / order คงสถานะเดิม

## ยังไม่ทำ

- เปลี่ยน `src/clients/orders.js` ไปเรียก Sales API เมื่อ Sales ตรวจ login แล้ว
