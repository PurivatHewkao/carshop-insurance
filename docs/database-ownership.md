# ขอบเขตฐานข้อมูล

| เจ้าของ                  | Database                          | ข้อมูล                                                                |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------- |
| คนที่ 1 (โจเซฟ) Identity | MySQL carshop_identity            | users, password hashes, roles/permissions                             |
| คนที่ 2 (กร) Catalog     | MySQL carshop_catalog             | รถ รุ่น ราคา สถานะ stock โปรโมชั่น                                    |
| คนที่ 2 (กร) Catalog     | MongoDB carshop_catalog_documents | รายละเอียดเทคนิค อ้าง carId ของ Catalog                               |
| คนที่ 3 (เฟียร์) Sales   | MySQL carshop_sales               | orders/items, appointments, assignments, customer requests, approvals |
| คนที่ 4 (ดิว) Payment    | MySQL carshop_payment             | payments/invoices/refunds จำลอง                                       |
| คนที่ 5 (อั้ม) Reporting | MongoDB carshop_reporting         | activity logs; report inputs ขอจาก API ของเจ้าของ                     |

ห้าม query/แก้ database ของเพื่อน ห้าม cross-service FK และห้าม FK ข้าม MySQL/MongoDB Frontend ไม่เข้าฐานข้อมูล
MySQL server เดียวหลาย databases ได้ แต่แต่ละ service ใช้ credentials/permissions ของตัวเอง ไม่มี fallback credentials

## Draft IDs — ต้องตกลงก่อน implement schema

เสนอ domain ID เป็น UUID string: MySQL CHAR(36), JSON string, MongoDB reference เป็น string; MongoDB _id เป็น ObjectId ภายใน collection ได้แต่ไม่ใช้แทน public domain ID โดยไม่ตกลง
Naming ใน JSON: userId, carId, orderId, paymentId, invoiceId, refundId; SQL snake_case เช่น user_id
Sales เก็บ customerId/sellerId จาก Identity และ carId จาก Catalog; Payment เก็บ orderId จาก Sales; Reporting เก็บ sourceService และ entityId ตาม contract
ตรวจความมีอยู่ผ่าน API หรือ snapshot ตามที่ตกลง ไม่มี join ข้าม DB
Order items เก็บ snapshot รุ่น/ราคา ณ สั่งซื้อจาก Catalog ห้ามอิงราคาปัจจุบันเพื่อแก้ยอดย้อนหลัง
Money เสนอ MySQL DECIMAL(12,2) และ JSON decimal string พร้อม currency เช่น THB; ห้ามคำนวณเงินด้วย float โดยไม่มีข้อตกลง
Dates เสนอ UTC ISO-8601 ใน API; status enums และ transitions ให้เจ้าของตกลงก่อน schema

ยังไม่มี schema/migrations เต็ม เพิ่ม versioned SQL migrations ใน database/migrations/ และ models ตาม database/README.md ของ service
การทำรายงานไม่ทำให้ MongoDB กลายเป็นแหล่งหลักของราคา stock ยอดชำระหรือสถานะธุรกรรม
TLS/allowlist/pool limits ของฐานข้อมูลภายนอกต้องตั้งตาม provider; ห้ามปิด certificate verification เพื่อแก้ปัญหา
