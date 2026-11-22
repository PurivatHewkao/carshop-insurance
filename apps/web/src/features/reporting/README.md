# Reporting frontend — คนที่ 5 (อั้ม)

หน้า Reporting เรียกข้อมูลผ่าน Reporting Service เท่านั้น ไม่เชื่อม MySQL/MongoDB จาก Browser

## หน้าและ route

- `/manager` — Dashboard สำหรับ Manager
- `/manager/reports/insurance` — หน้ารายงานสำหรับ Manager (ยอดขาย, ยอดขายตามพนักงาน/รุ่นรถ, สต็อก, นัดหมาย)
- `/reporting` — route สำหรับ Manager/Admin และใช้หน้าเดียวกัน

## API

กำหนด `VITE_REPORTING_API_URL` เป็น base URL ที่ลงท้าย `/api/v1` เช่น `http://localhost:3005/api/v1` (ค่า default ใช้ localhost:3005)

หน้าเว็บเรียก:

- `GET reports/sales-summary?date_from=&date_to=&group_by=day|month|year`
- `GET reports/sales-by-seller`
- `GET reports/sales-by-model`
- `GET reports/inventory`
- `GET reports/appointments`
- `GET reports/finance` (Payments, Refunds, Invoices, Finance Requests)

ส่ง Identity session cookie ผ่าน `withCredentials` และไม่เก็บ credential ของฐานข้อมูลไว้ใน `VITE_` variables

## สถานะและข้อจำกัด

หน้าเว็บมี loading, error, empty state และ date filters; ไม่สร้าง mock data. รายงานการเงินใช้ API Payment จริงและแสดงยอดชำระสำเร็จ ยอดคืนเงิน ใบแจ้งหนี้ค้างชำระ และคำขอการเงินที่เปิดอยู่. Backend aggregation เรียก API ของ Sales, Payment และ Catalog และตรวจ session/role ผ่าน Identity ก่อนส่งข้อมูลรายงาน

ตาม `docs/database-ownership.md` Reporting ต้องใช้ API ของ Sales, Payment และ Catalog สำหรับข้อมูลธุรกรรม/รถ ไม่ query ตารางของ service อื่นโดยตรง. Activity Logs ยังไม่เปิด routes ตาม `docs/activity-log-contract-proposal.md` จนกว่าทีมจะอนุมัติ service authentication และ actor identity trust boundary.
