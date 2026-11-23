# catalog service — คนที่ 2 (กร)

รับผิดชอบ: รายการรถและจัดการรถ ดูคู่มือหลัก [team ownership](../../docs/team-ownership.md)

## รันแยก

ใช้ Node.js 24 LTS: cd services/catalog แล้ว npm install และ npm run dev (port 3002); npm start สำหรับรันโดยไม่ watch
คัดลอก .env.example เป็น .env เมื่อจะตั้งค่าฐานข้อมูล; health ทำงานได้แม้ไม่มี .env หรือ credentials
GET http://localhost:3002/api/v1/health ตอบ {"service":"catalog","status":"ok"}; เป็น liveness ไม่รับรอง database

## ไฟล์ที่แก้และตำแหน่งเพิ่มงาน

- src/app.js: mount routes เมื่อ implement จริง; ห้ามเปิด port ที่นี่
- src/server.js: local listener; Vercel ใช้ default export จาก src/app.js
- src/config/env.js และ src/config/mysql.js รวม src/config/mongodb.js: config และ lazy database connections
- src/modules/README.md: เพิ่ม module ของตัวเองเมื่อเริ่มงาน โดยแยก routes/controller/service/repository/validation ตามความจำเป็น
- src/middleware/errors.js: error และ 404 handlers; เพิ่ม auth middleware เมื่อ Identity contract พร้อม
- database/README.md: แนวทาง migrations/models; src/utils/README.md: helper ของ service
- package.json, package-lock.json, .env.example และ README.md: เจ้าของ service ดูแลเอง; ห้าม commit .env

## ลำดับเริ่มงาน

1. ตกลง car ID, ราคา และ stock contract กับคนที่ 3 (เฟียร์)
2. ออกแบบ MySQL รถ รุ่น สต็อก โปรโมชั่น และ MongoDB รายละเอียดเทคนิค
3. พัฒนา API ค้นหา รายละเอียด และ CRUD พร้อม validation
4. เชื่อมหน้ารายการรถและหน้าจัดการสำหรับ Admin

ประสานคนที่ 5 (อั้ม) ก่อนแก้ tooling หรือ contract กลาง และประสานเจ้าของ service ที่เกี่ยวข้องก่อนเปลี่ยน API
ก่อนส่ง integrate: อัปเดต OpenAPI/contract, validation/auth ตามที่ตกลง, tests กรณีสำเร็จและผิดพลาด, .env.example และคู่มือ; health/lint/build ต้องผ่าน ไม่มี success ปลอม
เจ้าของ service ต้องเชื่อมและแก้ปัญหาของตัวเอง คนที่ 5 (อั้ม) ประสาน integration ไม่ทำแทนทุกคน

## TOYOTY configurator (รถสั่งผลิต)

ฐานข้อมูล: ดู [database/README.md](database/README.md) (07 + 08) ราคาคำนวณที่ Catalog ที่เดียว หน้าเว็บและ Sales ขอราคาจาก Catalog เสมอ
ราคารถ = ราคารุ่นย่อย (model × trim) + ค่าสี + ค่าล้อ (ล้อเดียวกันราคาต่างกันได้ตาม trim)

| Method + Path | ใครเรียก | ทำอะไร |
| --- | --- | --- |
| GET /cars | ทุกคน | เฉพาะรุ่นที่ `is_active = 1`; ส่ง `include=hidden` เพื่อดูรุ่นเดิมด้วย; มี `fromPrice`, `configurable`, `trimCount` |
| GET /cars/:slug/configurator | ทุกคน | model + 3 trim + สี/ล้อที่เลือกได้ต่อ trim + ช่วงวันรับรถโดยประมาณ |
| POST /cars/quote | ทุกคน | `{ modelSlug, trim, colorId, wheelId? }` → `lines`, `total`, `estimatedReady`; คู่ที่เลือกไม่ได้ตอบ 422 `OPTION_NOT_ALLOWED` |
| GET /cars/eta?model=&trim= | ทุกคน | ช่วงวันรับรถถ้าสั่งวันนี้ |
| POST /cars/units | Sales (`X-Internal-Secret`) หรือ session customer/seller/manager/admin | สร้างแถว `cars` ตามสเปก status RESERVED, `production_status = QUOTED`, VIN ชั่วคราว `TYTO…` ตอบ `carId` + ราคา |
| POST /cars/units/:id/release | Sales (`X-Internal-Secret`) หรือ seller/manager/admin/stock | order ไม่สำเร็จ/ยกเลิก/ไม่อนุมัติ → รถเป็น INACTIVE (ไม่กลับเข้าสต็อก) และคืนที่ในคิวผลิต |
| GET /cars/units, GET /cars/units/:id | admin/stock/manager (+seller สำหรับรายคัน) | รายการรถสั่งผลิต กรอง `model`, `trim`, `productionStatus`, `state=open\|delayed\|cancelled\|all`, `q` |
| PATCH /cars/:carId/production | admin/stock/manager; seller เฉพาะ DELIVERED | `{ status: ขั้นถัดไป }` หรือ `{ buildWeek: 'YYYY-MM-DD' (วันจันทร์) }` เลื่อนคิว; IN_PRODUCTION ใส่ `vin` จริงได้ |
| GET /cars/inventory | admin/stock/manager | หน้าสต็อก TOYOTY: นับตาม model × trim + คิวผลิต 8 สัปดาห์ |
| GET /cars/production-slots?model=, PUT /cars/production-slots/:model | staff / admin, stock | ดูคิว; ตั้ง `capacity` ต่อสัปดาห์ (ส่ง `weekStart` = ตั้งเฉพาะสัปดาห์นั้น) |
| GET/POST /cars/:slug/trims, PATCH /trims/:id, PUT /trims/:id/colors, PUT /trims/:id/wheels | admin, stock | จัดการรุ่นย่อยและตัวเลือก (สำหรับแท็บใน CatalogAdminPage) |
| GET /options, POST/PATCH /options/colors, /options/wheels | ทุกคนอ่าน / admin, stock แก้ | สีและล้อกลาง |

ขั้นผลิต: QUOTED → SCHEDULED (ระบบจองสัปดาห์ว่างแรกหลังชิ้นส่วนครบ: Eco 14 วัน, Balanced 21, High Performance 35) → IN_PRODUCTION → IN_TRANSIT → READY → DELIVERED
ช่วงรับรถ = วันจันทร์ของสัปดาห์ผลิต + 7 ถึง + 14 วัน; `delayDays` เทียบกับวันที่แจ้งลูกค้าครั้งแรก (`first_eta_to`) และ `canCancelForDelay` เมื่อเกิน 30 วัน

สำหรับ Sales (เฟียร์) ใน POST /orders ที่ส่ง configuration มา: 1) POST /cars/quote 2) POST /cars/units ได้ `carId` 3) สร้าง order ด้วย `carId` เดิม
ถ้าข้อ 3 พัง หรือ order ถูกยกเลิก/ไม่อนุมัติ ให้เรียก POST /cars/units/:id/release ตั้ง `CATALOG_INTERNAL_SECRET` ให้ตรงกันทั้งสอง service
หน้าแต่งรถส่งลูกค้าไป `/requests?type=จอง&brand=TOYOTY&car=<ชื่อรุ่น>&variant=<trim>&color=<ชื่อสี>&model=<slug>&trim=<CODE>&colorId=<code>&wheelId=<code>`
รถโชว์ (AVAILABLE, `production_status` NULL) มีรุ่นละ 1 คันไว้นัดทดลองขับ — dropdown สร้าง order ของ Seller ไม่ควรเลือกคันนี้ขาย

ทดสอบ: `npm test` (คำนวณสัปดาห์ผลิต/ช่วงรับรถ/เงิน)
