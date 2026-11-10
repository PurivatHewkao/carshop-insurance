# Business modules — คนที่ 4 (ดิว)

- `health/` liveness
- `payments/` ชำระเงินจำลอง (`routes.js` → `service.js`; `balance.js` คำนวณยอดของ order)
- `refunds/` คำขอคืนเงิน + Admin อนุมัติ/ปฏิเสธ
- `invoices/` ใบแจ้งหนี้

ทุก module mount ที่ `/api/v1` ใน `src/app.js`; รายการ endpoint อยู่ใน `../../README.md`
ยังไม่มี auth/role checks จนกว่า Identity contract พร้อม — ไม่มี middleware ที่แสร้งว่าตรวจสิทธิ์แล้ว
