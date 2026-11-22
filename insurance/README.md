# NOVA INSURE × TOYOTY

<!-- Insurance: current seller-assisted workflow supersedes historical direct checkout below. -->
**Flow ปัจจุบัน:** ซื้อพร้อมรถผ่าน Seller ของ TOYOTY เท่านั้น ชำระครบแล้วรอแอดมิน NOVA อนุมัติ ดู [คู่มือ integration และการเปิดใช้งาน](../docs/nova-insurance-integration.md) ส่วน checkout โดยตรงด้านล่างเป็นเอกสารของ flow เก่าที่ปิดแล้ว

เว็บไซต์ประกันรถยนต์ **จำลองเพื่อการศึกษา** ใน monorepo เดิม ข้อมูล ราคา ความคุ้มครอง เลขกรมธรรม์ และส่วนลดทั้งหมดเป็นตัวอย่าง ไม่มีการชำระเงินหรือความคุ้มครองจริง ไม่ใช่คำเสนอขายประกัน

## โครงสร้าง

- `frontend/`: React + Vite, React Router, Tailwind v4 และ Lucide; หน้าหลัก `/`, `/buy/:planId`, `/success/:policyId`
- `backend/`: Express service เดียว แยก modules plans, purchases, policies ใช้ mysql2/promise
- `backend/database/001_initial.sql`: 3 ตาราง InnoDB ในฐานข้อมูลแยกจาก TOYOTY
- TOYOTY: `apps/web/src/pages/InsurancePartnerPage.jsx`, public route `/insurance`; navbar/footer/บริการด่วนและ CTA หน้าแรกเชื่อมหน้าดังกล่าว

ไม่แก้ระบบ authentication, cart, orders, payment หรือสิทธิ์ role ของ TOYOTY ข้อมูลประกันเดิมในระบบขายไม่เกี่ยวข้องกับ NOVA

## รันในเครื่อง

ใช้ Node.js **24.x** และ MySQL **8.0 ขึ้นไป** สร้าง database ใหม่ด้วยผู้ดูแล MySQL โดยห้ามใช้ database TOYOTY:

```sql
CREATE DATABASE nova_insurance CHARACTER SET utf8mb4;
CREATE DATABASE nova_insurance_test CHARACTER SET utf8mb4;
```

สร้าง MySQL user เฉพาะ NOVA และให้สิทธิ์ในฐานข้อมูลดังกล่าว ใส่ credentials ในไฟล์ `.env` ซึ่งถูก ignore ห้าม commit

```powershell
cd insurance/backend
npm ci
Copy-Item .env.example .env
# แก้ .env ให้ตรง MySQL ของคุณ
npm run migrate
npm run seed
npm start
```

เปิด terminal อีกหน้าต่าง:

```powershell
cd insurance/frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

เปิด TOYOTY ตามขั้นตอน README หลักของ repo โดยเพิ่ม `VITE_INSURANCE_FRONTEND_URL=http://localhost:5174` ลง env ที่ใช้งาน แล้ว restart Vite

URL local: TOYOTY `http://localhost:5173/insurance`; NOVA `http://localhost:5174`; API `http://localhost:3010/api/health`

Migration/seed รันซ้ำได้: migration สร้างตารางเมื่อยังไม่มี; seed อัปเดต 4 แผนตาม slug/UUID เดิม ไม่ลบ purchase/policy และไม่ reset ข้อมูลเมื่อ server restart ไม่มี in-memory หรือ mock database ใน runtime

## Environment

| ส่วน            | ตัวแปร                                                                  | ค่า/ความหมาย                                                                                                    |
| --------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| TOYOTY frontend | `VITE_INSURANCE_FRONTEND_URL`                                           | public origin ของ NOVA เช่น `https://nova.example.com`                                                          |
| NOVA frontend   | `VITE_INSURANCE_API_URL`                                                | URL API **รวม `/api`** เช่น `https://api.example.com/api`                                                       |
| NOVA frontend   | `VITE_TOYOTY_URL`                                                       | public URL TOYOTY สำหรับปุ่มกลับ `/insurance`                                                                   |
| NOVA backend    | `PORT`                                                                  | Railway inject ให้; local default 3010                                                                          |
| NOVA backend    | `DATABASE_URL`                                                          | `mysql://user:password@host:port/nova_insurance` (URL-encode credentials)                                       |
| NOVA backend    | `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` | ใช้แทน DATABASE_URL; ไม่ใช้ชื่อ env ของ service TOYOTY โดยอัตโนมัติ                                             |
| NOVA backend    | `MYSQL_SSL`                                                             | `true` เมื่อ provider ต้องการ TLS พร้อม certificate ที่ตรวจสอบได้                                               |
| NOVA backend    | `INSURANCE_FRONTEND_URL`                                                | URL frontend ที่อนุญาต CORS เพียง origin เดียว; ต้องระบุใน production                                           |
| NOVA backend    | `TOYOTY_PUBLIC_URL`                                                     | public URL TOYOTY สำหรับ deployment configuration; browser redirect ใช้ `VITE_TOYOTY_URL` ซึ่งต้องตั้งให้ตรงกัน |
| NOVA backend    | `NODE_ENV`                                                              | `production` บน Railway                                                                                         |
| NOVA backend    | `TRUST_PROXY`                                                           | `0` local; `1` เมื่ออยู่หลัง Railway trusted single proxy เพื่อ rate limit ตาม IP จริง                          |
| tests เท่านั้น  | `INSURANCE_TEST_DATABASE_URL`                                           | database แยก ชื่อท้าย `_test` สำหรับ integration suite                                                          |

Vite อ่าน env ตอน build ต้อง rebuild เมื่อเปลี่ยน URL ตัวแปร `VITE_*` เป็นข้อมูล public ห้ามใส่ secret; production ต้องกำหนด HTTPS URL ทั้งสองเว็บไซต์และ API ให้ครบ อย่าใช้ fallback localhost

## API

ทุก success ใช้ `{ data, meta }`; error ใช้ `{ error: { code, message, details } }`:

- `GET /api/health`: ตรวจ `SELECT 1` จริง ถ้า DB ใช้ไม่ได้ตอบ 503
- `GET /api/plans[?source=toyoty]`: 4 แผนจาก MySQL พร้อมราคาที่ backend คำนวณ
- `GET /api/plans/:id[?source=toyoty]`: รายละเอียดและราคาสำหรับ checkout
- `POST /api/purchases`: รับ planId, customer `{fullName, phone, email}`, vehicle `{brand, model, year, registrationNumber}`, source (`direct`/`toyoty`), clientRequestId (UUID)
- `GET /api/policies/:id`: **ต้องมี** `Authorization: Bearer <receiptToken>` ไม่มี token ตอบ 401; token ผิดหรือ id ไม่พบตอบ 403 เหมือนกัน

ราคาอ่านจาก MySQL เท่านั้น คิดเป็นสตางค์: ส่วนลด source toyoty = min(round(ราคา × 5%), 1,000 บาท) ตัวอย่าง Smart Drive 6,490 − 324.50 = **6,165.50**; Signature 17,900 − 895 = **17,005**

POST ใช้ transaction เดียวสร้าง purchase/policy; UUID ทั้งสอง record และ policy number `NOVA-YYYY-<32 random hex>` มี unique constraints กรมธรรม์ทุกใบมีสถานะ `ISSUED_DEMO` เท่านั้น ใช้ prepared statements สำหรับ input ทั้งหมด

## Receipt token และการส่งซ้ำ

- backend สร้าง token จาก `crypto.randomBytes(32)` เก็บเฉพาะ SHA-256 hash ใน DB และเปรียบเทียบแบบ constant-time
- ส่ง plaintext token เฉพาะ response สร้างรายการ แล้ว frontend เก็บ `sessionStorage` ต่อ policy; ไม่มี token หรือข้อมูลส่วนตัวใน URL และไม่ใช้ localStorage
- API ใบรับรายการและ response POST ใช้ `Cache-Control: no-store`; ไม่ log token หรือ PII
- frontend disable/lock submit; เก็บ clientRequestId ใน sessionStorage ต่อแผนและช่องทาง แม้ timeout/refresh ก็ retry ด้วย ID เดิม
- unique clientRequestId กันการส่งพร้อมกันหลาย request; duplicate ตอบ **409 DUPLICATE_REQUEST โดยไม่ส่ง token หรือ PII กลับ** ใครรู้ request ID อย่างเดียวก็เอาใบรับรายการไม่ได้
- หากสำเร็จแล้วกลับ checkout แผนเดิมในแท็บเดิม ระบบพากลับใบรับรายการเดิม
- ถ้า DB commit สำเร็จแต่ response แรกสูญหาย ก่อน browser ได้ token การ retry จะเป็น 409 และ **ไม่สามารถกู้ token** ได้ใน MVP นี้ ห้ามสร้าง request ID ใหม่อัตโนมัติ เพราะอาจออกกรมธรรม์ซ้ำ ต้องออกแบบ authenticated recovery เพิ่มก่อนใช้งานจริง
- ปิดแท็บ/ล้าง sessionStorage แล้วจะเปิดใบรับรายการด้วย URL อย่างเดียวไม่ได้ ไม่มี public policy search; ไม่ใส่ข้อมูลอ่อนไหวจริงใน demo

Rate limit สร้าง purchase 20 ครั้ง/15 นาที/IP, request body 16 KiB, CORS ตาม frontend origin, Helmet ค่าเริ่มต้น limiter เก็บใน memory ของ service เดียวและ reset เมื่อ restart; deployment MVP ใช้ **1 replica** ยังไม่ใช่ distributed abuse protection

## Referral และ redirect

TOYOTY ส่งเพียง `?source=toyoty` และ NOVA รักษาค่านี้ผ่านลิงก์ภายใน หน้าสำเร็จตรวจ source ที่บันทึกจาก backend เพื่อแสดงปุ่มกลับ

**source=toyoty เป็นโปรโมชันสาธิต ไม่ใช่ referral ที่ตรวจสอบตัวตนได้** ผู้ใช้แก้ query เองได้ ก่อนใช้จริงต้องเปลี่ยนเป็น signed referral พร้อมตรวจลายเซ็น/วันหมดอายุฝั่ง server ห้ามส่ง JWT, password หรือข้อมูลบัญชี TOYOTY ผ่าน URL ไม่มี SSO/sync/webhook

ปลายทาง redirect มาจาก build-time env ที่ตรวจ scheme http/https เท่านั้น ไม่รับ returnUrl/redirectUrl จาก user ปุ่มกลับใช้ `<VITE_TOYOTY_URL origin>/insurance`

## ทดสอบ

```powershell
cd insurance/backend
npm test
# ตั้ง INSURANCE_TEST_DATABASE_URL ใน .env ให้เป็น DB แยกท้าย _test
npm run test:integration
cd ../frontend
npm run build
cd ../../apps/web
npm run build
```

Integration test จะ skip ชัดเจนเมื่อไม่มี test URL; ถ้าระบุแล้วเชื่อมต่อไม่ได้จะ fail ทดสอบ migration/seed ซ้ำ, plans จริง, ส่วนลด, ไม่เชื่อราคา client, transaction, duplicate รวม concurrent requests, token 401/403, ID ไม่ซ้ำ และอ่านจาก connection ใหม่ ตรวจเก็บ hash เท่านั้น ล้างเฉพาะ records ที่ suite สร้างเมื่อจบ ไม่ drop database

Manual demo: TOYOTY → เมนูประกันรถยนต์ → NOVA → เลือก Smart Drive → เห็น 6,165.50 → กรอกข้อมูลตัวอย่าง → ยืนยัน → ใบรับรายการ → refresh ยังเปิดได้ในแท็บเดิม → กลับ TOYOTY ตรวจ mobile 390px และ keyboard focus; เปิด success URL ในแท็บใหม่ต้องไม่เห็น PII

ตรวจ DB โดยไม่อ่าน hash/token: `SELECT p.policy_number, p.status, b.final_amount FROM insurance_policies p JOIN insurance_purchases b ON b.id=p.purchase_id;`

## Deploy จาก repository เดียว

ไม่สร้าง GitHub repo ใหม่ คงรูปแบบ deployment TOYOTY เดิม และ deploy production ตามคำขอของเจ้าของโปรเจกต์ ดู URL และสถานะจริงที่ [DEPLOYMENT.md](DEPLOYMENT.md)

### Railway: backend + MySQL

1. เพิ่ม MySQL service **แยกจาก TOYOTY** ใน Railway แล้วเพิ่ม service จาก repo เดิม Root Directory `insurance/backend` ใช้ Node 24
2. กำหนด DATABASE_URL เป็น reference ของ MySQL service ใหม่นี้ หรืออ้างอิงตัวแปร MYSQLHOST/PORT/USER/PASSWORD/DATABASE จาก service ใหม่ ห้ามชี้ database TOYOTY
3. กำหนด `NODE_ENV=production`, `INSURANCE_FRONTEND_URL`, `TOYOTY_PUBLIC_URL`, `TRUST_PROXY=1` (single trusted proxy); ใช้ PORT ที่ Railway inject
4. ตั้ง Root Directory `/insurance/backend`, builder Railpack, start `npm start`, pre-deploy `npm run migrate && npm run seed`, healthcheck `/api/health`, timeout 120 วินาที ใน service settings โดยตรง
5. `railway.json` เก็บตัวอย่าง config รุ่นเดิมไว้ แต่ Railway ปัจจุบัน deprecate Config as Code แล้ว การ deploy ครั้งนี้ตั้งค่าผ่าน service settings ไม่พึ่งการอ่านไฟล์ดังกล่าว ดู [Railway Infrastructure as Code](https://docs.railway.com/infrastructure-as-code#migrating-from-config-as-code) สำหรับการย้ายไป `.railway/railway.ts` ภายหลัง
6. เปิด public domain backend และตรวจ `/api/health` กับ `/api/plans` ก่อน deploy frontend ใช้ 1 replica สำหรับ in-memory rate limiter

### Vercel: NOVA frontend

1. เพิ่ม Vercel project จาก GitHub repo เดิม Root Directory **`insurance/frontend`**, framework Vite, Node 24, install `npm ci`, build `npm run build`, output `dist`
2. ตั้ง `VITE_INSURANCE_API_URL=https://<railway-domain>/api`, `VITE_TOYOTY_URL=https://<toyoty-domain>`
3. `vercel.json` มี SPA rewrite เพื่อ refresh `/buy/...` และ `/success/...` ได้
4. นำ NOVA public origin ไปตั้ง `INSURANCE_FRONTEND_URL` บน backend และ redeploy backend ให้ CORS ตรงกัน ไม่ใช้ wildcard

### TOYOTY เดิม

ตั้ง `VITE_INSURANCE_FRONTEND_URL=https://<nova-domain>` ใน Vercel project TOYOTY เดิม แล้ว rebuild/deploy ด้วย configuration เดิม ไม่มีการเปลี่ยน API env หรือ routing ของ service เดิม

อ้างอิง configuration: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Railway healthchecks](https://docs.railway.com/deployments/healthchecks), [Express on Railway](https://railway.com/guides/express)

ดูผลตรวจจริงและข้อจำกัดล่าสุดที่ [VERIFICATION.md](VERIFICATION.md)
