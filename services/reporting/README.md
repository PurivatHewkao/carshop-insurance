# reporting service — คนที่ 5 (อั้ม)

รับผิดชอบ: รายงานและ Dashboard ดูคู่มือหลัก [team ownership](../../docs/team-ownership.md)

## รันแยก

ใช้ Node.js 24 LTS: cd services/reporting แล้ว npm install และ npm run dev (port 3005); npm start สำหรับรันโดยไม่ watch
คัดลอก .env.example เป็น .env เมื่อจะตั้งค่าฐานข้อมูล; health ทำงานได้แม้ไม่มี .env หรือ credentials
GET http://localhost:3005/api/v1/health ตอบ {"service":"reporting","status":"ok"}; เป็น liveness ไม่รับรอง database

## Reports และ Activity Logs

Report endpoints ตรวจ Identity session และ role Manager/Admin ก่อนเรียกข้อมูลจาก Sales, Payment และ Catalog APIs. Activity Logs เปิดเฉพาะ GET สำหรับ Manager/Admin; POST event ingestion ยังไม่เปิดจนกว่าทีมจะอนุมัติ internal authentication และ actor-identity contract ดู `docs/activity-log-contract-proposal.md` และ `src/modules/activity-logs/README.md`

## ไฟล์ที่แก้และตำแหน่งเพิ่มงาน

- src/app.js: mount routes เมื่อ implement จริง; ห้ามเปิด port ที่นี่
- src/server.js: local listener; Vercel ใช้ default export จาก src/app.js
- src/config/env.js และ src/config/mongodb.js: config และ lazy database connections
- src/modules/README.md: เพิ่ม module ของตัวเองเมื่อเริ่มงาน โดยแยก routes/controller/service/repository/validation ตามความจำเป็น
- src/middleware/errors.js: error และ 404 handlers; ตรวจ Identity session และ role ใน business routes
- database/README.md: แนวทาง migrations/models; src/utils/README.md: helper ของ service
- src/clients/README.md: ตำแหน่ง HTTP clients ของ dependencies
- package.json, package-lock.json, .env.example และ README.md: เจ้าของ service ดูแลเอง; ห้าม commit .env

## ลำดับเริ่มงาน

1. ตกลง UI, routes และ contracts ร่วมกับเจ้าของ services
2. พัฒนา Layout, Home และ Dashboard ตามสิทธิ์หลัง auth พร้อม
3. พัฒนา Reporting ผ่าน API ของ Sales/Payment/Catalog และ activity logs
4. ตรวจ integration โดยให้เจ้าของแต่ละ service แก้ปัญหาของตัวเอง
5. เตรียม 6 Vercel projects และทดลอง deploy เมื่อทีมอนุมัติในงานภายหลัง

ประสานคนที่ 5 (อั้ม) ก่อนแก้ tooling หรือ contract กลาง และประสานเจ้าของ service ที่เกี่ยวข้องก่อนเปลี่ยน API
ก่อนส่ง integrate: อัปเดต OpenAPI/contract, validation/auth ตามที่ตกลง, tests กรณีสำเร็จและผิดพลาด, .env.example และคู่มือ; health/lint/build ต้องผ่าน ไม่มี success ปลอม
เจ้าของ service ต้องเชื่อมและแก้ปัญหาของตัวเอง คนที่ 5 (อั้ม) ประสาน integration ไม่ทำแทนทุกคน


## Reporting aggregation

- Report routes verify the Identity session and allow only `manager` / `admin`.
- Sales orders and appointments are read from `SALES_API_URL`; order balances are read from `PAYMENT_API_URL`; inventory is read from `CATALOG_API_URL`.
- The original Authorization header or Identity session cookie is forwarded to downstream services that require it.
- Reporting never queries another service's MySQL tables. Its MongoDB connection remains reserved for Reporting-owned activity events.
- Configure `IDENTITY_API_URL`, `SALES_API_URL`, `PAYMENT_API_URL`, `CATALOG_API_URL`, `SOURCE_API_TIMEOUT_MS`, and `CORS_ORIGINS` in the Reporting service environment.

## Financial report

`GET /api/v1/reports/finance` aggregates the existing Payment Service endpoints `/payments`, `/refunds`, `/invoices`, and `/finance-requests`. It forwards the current Identity session and reads paginated responses (100 rows per page). Date filters are passed as `dateFrom`/`dateTo` to Payments and Refunds and applied to the other returned collections.

Sales `GET /orders` and `GET /appointments` currently cap results at 500 without pagination. Reporting exposes a cap warning rather than silently claiming those aggregates are complete. The source-service owners must add pagination before the reports can be exhaustive.
