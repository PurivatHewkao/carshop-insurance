# คิวผลิตรถสั่งทำ (production)

เจ้าของ: ดิว · ตาราง: `production_capacity` + คอลัมน์ production ใน `cars` (`database/09_production_queue.sql`)

รถคันไหนมี `cars.production_status` = รถสั่งผลิต ถ้าเป็น `NULL` = รถสต็อก (ทำงานแบบเดิมทุกอย่าง)

```
WAITING → SCHEDULED → IN_PRODUCTION → IN_TRANSIT → READY → DELIVERED   (ยกเลิก = CANCELLED)
```

| Method + Path | ใคร | ทำอะไร |
| --- | --- | --- |
| `GET /production/eta?model=<slug/uuid>&trim=ECO` | ทุกคน | ช่วงวันรับรถโดยประมาณ (ยังไม่จองคิว) |
| `GET /production/cars/:carId` | ทุกคน | สถานะผลิต + ช่วงรับรถ + `delayDays` ของรถ 1 คัน |
| `GET /production/queue?status=` | admin, stock, manager, finance, seller | รายการรถสั่งผลิต + ออเดอร์ + ลูกค้า |
| `GET /production/load?weeks=8` | เหมือนข้างบน | จองแล้ว / กำลังผลิตต่อสัปดาห์ แยกรุ่น |
| `PUT /production/capacity/:model` `{ weeklyCapacity }` | admin, stock | ตั้งกำลังผลิตต่อสัปดาห์ (ค่าเริ่ม 5) |
| `POST /production/cars/:carId/schedule` | admin, stock | WAITING → SCHEDULED สัปดาห์แรกที่ว่าง (ออเดอร์ต้อง CONFIRMED/PAID + จ่ายเงินจองแล้ว) |
| `PATCH /production/cars/:carId` `{ action }` | admin, stock (seller ได้แค่ DELIVER) | `QUEUE`, `RESCHEDULE {buildWeek}`, `START {vin}`, `SHIP {arrivalDate}`, `ARRIVE`, `DELIVER` |

กติกา

- รอชิ้นส่วนตาม trim: Eco 14 วัน, Balanced 21 วัน, High Performance 35 วัน; สัปดาห์ผลิต = วันจันทร์แรกหลังจากนั้นที่ยังไม่เต็ม
- ช่วงรับรถ = สัปดาห์ผลิต + 7 ถึง + 14 วัน; ตอน `SHIP` เหลือวันเดียว (วันที่รถถึงศูนย์)
- `first_eta_to` = คำสัญญาแรก; `delayDays` = `eta_to - first_eta_to`
- trim อ่านจาก `cars.trim_id → car_trims.code` (ของกร) ถ้ายังไม่มีตาราง ใช้ `trim` ใน body ของ schedule หรือค่าเริ่ม BALANCED

ฝั่ง Payment ที่ผูกกับคิวนี้ (`services/payment/src/clients/orders.js`)

- จ่าย `BALANCE` / `FINANCE_DISBURSEMENT` และออกใบแจ้งหนี้ได้เมื่อรถ `READY` แล้วเท่านั้น (ใบแจ้งหนี้ครบกำหนด +7 วัน)
- ลูกค้าขอคืนเงินหลังเริ่มผลิตไม่ได้ ยกเว้นล่าช้าเกิน 30 วัน; พนักงานยังคืนได้
- คืนเงินครบทุกบาท (ยังไม่ส่งมอบ) → ออเดอร์ CANCELLED, รถ INACTIVE + production CANCELLED (ไม่กลับเข้าสต็อก)

สำหรับกร (`POST /cars/units`): ตอนสร้างแถวรถสั่งผลิต ให้เรียก `markMadeToOrder(connection, carId)` จาก `repository.js` ใน transaction เดียวกัน (ตั้ง `production_status = 'WAITING'`)

ทดสอบ: `npm test` ใน `services/catalog` (ใช้ฐาน `carshop_catalog_test` สร้างใหม่ทุกรอบ; ห้ามรันตอน `.env` ชี้ Railway)
