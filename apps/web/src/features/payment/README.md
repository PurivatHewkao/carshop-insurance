# payment frontend — คนที่ 4 (ดิว)

หน้าการเงินทั้ง 4 หน้าเรียก Payment service จริง (`services/payment`, port 3004) ข้อมูลมาจาก MySQL `carshop_sql`
ไม่มีข้อมูลจำลองในหน้าเว็บแล้ว (`mockPaymentApi.js` ถูกลบ) — การตัดบัตรยังเป็นระบบจำลองที่ backend

## หน้า

| Route                    | Role     | ทำอะไรได้                                                                  |
| ------------------------ | -------- | -------------------------------------------------------------------------- |
| `/customer/transactions` | customer | ดูยอดค้าง ชำระ (โอน/บัตรจำลอง) ดูใบแจ้งหนี้ ขอคืนเงิน                      |
| `/seller/finance`        | seller   | ดูการชำระของลูกค้าที่ตัวเองขาย ออกใบแจ้งหนี้ ส่งเรื่องถึงการเงิน           |
| `/manager/invoices`      | manager  | ออก/ยกเลิกใบแจ้งหนี้ ดูยอดทุกออเดอร์                                       |
| `/admin/finance`         | admin    | ตรวจยอดโอน อนุมัติคืนเงิน รับเงินสด ใบแจ้งหนี้ ประวัติ ตอบเรื่องจากฝ่ายขาย |

backend กรองข้อมูลตาม role ของผู้ login เอง หน้าเว็บไม่ต้องกรอง

## ไฟล์

- `api/client.js` — Axios client (`withCredentials` ส่ง cookie session ของ Identity)
- `api/paymentApi.js` — ฟังก์ชันเรียก endpoint + `paymentError()` แปลงรหัส error เป็นข้อความไทย
- `hooks/usePaymentData.js` — `usePaymentData()` โหลด order-balances/payments/invoices/refunds(/finance-requests) พร้อม loading/error/reload; `useAction()` สำหรับปุ่มที่ส่งข้อมูล
- `utils/finance.js` — จับคู่รายการ (บิลของออเดอร์, ยอดคืนได้, สถานะเกินกำหนด) · `utils/format.js` — เงิน/วันที่/ป้ายสถานะ
- `components/FinanceUi.jsx` — ชิ้นส่วน UI ร่วม + ใบแจ้งหนี้ (พิมพ์/บันทึก PDF จากเบราว์เซอร์)

## รัน

จาก root: `npm run dev` (หรืออย่างน้อย `dev:web`, `dev:identity`, `dev:sales`, `dev:payment`) แล้ว login ด้วยบัญชีของ role นั้น
ตั้งค่า payment ตาม `services/payment/README.md` ก่อน (`.env` + `npm run db:migrate`)

## ประสาน

- route `/admin/finance` อยู่ใต้ `RequireRole roles={['admin']}` ใน `src/routes/index.jsx` (ไฟล์กลาง) — role `finance` ยังเข้าไม่ได้ทางเว็บ แม้ backend อนุญาตแล้ว ต้องตกลงกับโจเซฟ/อั้ม
- Layout, common components, routes กลาง, styles และ `apps/web/package.json` ประสานคนที่ 5 (อั้ม) ก่อนแก้
