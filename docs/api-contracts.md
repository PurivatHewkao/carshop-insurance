# API contracts

## Implemented: Health เท่านั้น

Base URL ทุกตัวรวม /api/v1 เช่น http://localhost:3001/api/v1; client ใช้ relative path health และ normalize trailing slash

| Owner      | Service   | Local URL                    | Method/path | Auth  | Response 200                          |
| ---------- | --------- | ---------------------------- | ----------- | ----- | ------------------------------------- |
| 1 (โจเซฟ)  | identity  | http://localhost:3001/api/v1 | GET /health | ไม่มี | {"service":"identity","status":"ok"}  |
| 2 (กร)     | catalog   | http://localhost:3002/api/v1 | GET /health | ไม่มี | {"service":"catalog","status":"ok"}   |
| 3 (เฟียร์) | sales     | http://localhost:3003/api/v1 | GET /health | ไม่มี | {"service":"sales","status":"ok"}     |
| 4 (ดิว)    | payment   | http://localhost:3004/api/v1 | GET /health | ไม่มี | {"service":"payment","status":"ok"}   |
| 5 (อั้ม)   | reporting | http://localhost:3005/api/v1 | GET /health | ไม่มี | {"service":"reporting","status":"ok"} |

Health ไม่ใช้ DB และตั้ง Cache-Control: no-store; ไม่ยืนยัน business readiness
Error envelope: {"error":{"code":"NOT_FOUND","message":"Route not found"}} สำหรับ 404
Malformed JSON ตอบ 400 BAD_REQUEST, payload ใหญ่เกินตอบ 413, unhandled exception ตอบ 500 INTERNAL_ERROR โดยไม่เผยรายละเอียด
CORS อนุญาตเฉพาะ origins ตาม CORS_ORIGINS; origin ที่ไม่อนุญาตไม่มี Access-Control-Allow-Origin header แต่ CORS ไม่ใช่ authentication

## Planned: ยังไม่มี business endpoints

| งาน                                         | เจ้าของ | คู่เชื่อม                               | ข้อตกลงก่อนพัฒนา                                         |
| ------------------------------------------- | ------- | --------------------------------------- | -------------------------------------------------------- |
| users/auth/roles                            | 1       | ทุกคน                                   | JWT claims, expiry, roles, password policy, auth errors  |
| cars/models/stock/promotions                | 2       | Sales (3), Reporting (5)                | price snapshot, reserve/release stock, concurrency       |
| orders/items/statuses                       | 3       | Catalog (2), Payment (4), Reporting (5) | totals, status transitions, idempotency                  |
| appointments/assignments/requests/approvals | 3       | Identity (1)                            | Seller/Manager permissions และ transitions               |
| payments/invoices/refunds simulation        | 4       | Sales (3), Reporting (5)                | order validation, internal notification, replay handling |
| reports/activity logs                       | 5       | Sales/Payment/Catalog                   | aggregation, pagination, log privacy/retention           |

## แบบฟอร์มกรอกก่อนสร้าง API

- สถานะ: planned / implemented / deprecated
- Owner และผู้ใช้ contract:
- Method:
- Base URL และ path:
- Auth/roles/internal authentication:
- Request: headers, params, query, body พร้อม types และ validation
- Response: status, headers, JSON schema และตัวอย่าง (ระบุชัดว่าเป็นตัวอย่าง)
- Errors: status, code, message
- ID types, money/currency, dates/timezone:
- Idempotency/concurrency/retry/timeout:
- Pagination/filtering และ compatibility:
- Acceptance checks และ OpenAPI reference:

เพิ่ม OpenAPI spec ใต้ docs/openapi/ เมื่อมี contract ที่ตกลงแล้ว ยังไม่สร้าง spec ปลอมและไม่ติดตั้ง Swagger/validation/JWT/bcrypt ที่ไม่ได้ใช้
JWT_SECRET และ INTERNAL_API_SECRET ต้องเพิ่มใน backend .env.example/hosting env เมื่อ implement auth/internal APIs เท่านั้น ห้ามนำเข้า VITE_
ทุก contract change ให้เจ้าของ API ประสานผู้เรียกและคนที่ 5 (อั้ม) ก่อน merge
