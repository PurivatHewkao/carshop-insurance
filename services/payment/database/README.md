# ฐานข้อมูลของ payment

เจ้าของ: คนที่ 4 (ดิว)
ใช้ MySQL `carshop_sql` ร่วมกับทีมตาม `db schema/01_mysql_schema.sql` (ตาราง `payments`, `invoices`)

- `migrations/001_refunds_and_idempotency.sql` เพิ่มตาราง `refunds` และ `payment_idempotency_keys` (ไม่แก้ตารางกลาง)
- รัน: `npm run db:migrate` หลังสร้าง schema กลางแล้ว (รันซ้ำได้)
- Rollback ในเครื่อง: `DROP TABLE refunds; DROP TABLE payment_idempotency_keys;`
- ไม่รัน migration อัตโนมัติเมื่อ import app
