# Insurance: carshop × NOVA

เพิ่ม flow ซื้อประกันพร้อมรถ โดยแยกข้อมูล NOVA จากประกันเก่า ไม่มี dependency ใหม่
จุดแก้ในไฟล์เดิมมี comment `Insurance:` หรือ `Insurance` กำกับ

## พฤติกรรม

1. Seller เลือกแพ็กเกจ NOVA หรือไม่รับประกัน หากเลือกต้องระบุวันส่งมอบรถ
2. NOVA คิดส่วนลด TOYOTY 5% สูงสุด 1,000 บาท แล้วลงลายเซ็นราคาและความคุ้มครอง
3. Sales ตรวจราคาซ้ำก่อนสร้าง order ถ้าราคาต่างจากที่ Seller เห็น ตอบ 409 ให้โหลดใหม่
4. Sales บันทึกเบี้ยสุทธิใน `orders.insurance_premium` และ snapshot ใน `order_nova_insurance` ใน transaction เดียวกัน
5. Manager อนุมัติและ Payment ยืนยันจ่ายครบตาม logic เดิม
6. Worker ใน Sales อ่านเฉพาะ order `PAID`/`COMPLETED` ที่มี NOVA แล้วส่งคำขอ
7. ลูกค้าเห็น “รอประกันอนุมัติ” แอดมิน NOVA login ด้วยบัญชีแยกและกดอนุมัติได้อย่างเดียว
8. Sales ตรวจผลจาก NOVA แล้วบันทึกกรมธรรม์ให้ `/customer/insurance`

วันคุ้มครองเริ่มจากวันส่งมอบที่ Seller ระบุ นานหนึ่งปี สิ้นสุดก่อนวันครบรอบหนึ่งวัน
ตัวอย่าง 2026-12-01 ถึง 2027-11-30 รวมวันสิ้นสุด กรณีเริ่ม 2024-02-29 สิ้นสุด 2025-02-28
วันที่เก็บเป็น DATE ไม่แปลง timezone แอดมินอนุมัติก่อนวันเริ่มได้ หน้าเว็บแสดงวันเริ่มแยกจากสถานะออกกรมธรรม์

หน้า NOVA แสดงแพ็กเกจได้ แต่ `/buy/:planId` เป็นคำแนะนำให้ติดต่อ Seller
`POST /api/purchases` ตอบ 403 เสมอ ใบรับรายการเก่ายังอ่านได้ด้วย receipt token เดิม
ข้อมูลใหม่ใช้ตาราง partner แยกจาก `insurance_purchases`/`insurance_policies` เก่า

## ไฟล์เดิมของ carshop ที่แตะ

| ไฟล์                                                        | เหตุผล                                               |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `apps/web/src/features/sales/hooks/useOrderForm.js`         | โหลด NOVA แยก ส่งวันส่งมอบและเบี้ยที่ Seller เห็น    |
| `apps/web/src/features/sales/pages/SellerSalesFormPage.jsx` | แทรก component insurance                             |
| `apps/web/src/features/sales/routes.jsx`                    | เพิ่มหน้าประกันของฉัน                                |
| `apps/web/src/routes/pageList.js`                           | แทน placeholder ประกันของฉัน                         |
| `apps/web/src/pages/InsurancePartnerPage.jsx`               | เปลี่ยนข้อความซื้อเป็นดูแพ็กเกจ/ซื้อผ่าน Seller      |
| `services/sales/src/modules/orders/routes.js`               | รับข้อมูล NOVA เพิ่ม                                 |
| `services/sales/src/modules/orders/repository.js`           | ใช้เบี้ย NOVA และบันทึก snapshot ใน transaction เดิม |
| `services/sales/src/app.js`                                 | ลงทะเบียน insurance router                           |
| `services/sales/src/server.js`                              | เริ่ม/หยุด worker                                    |
| `services/sales/.env.example`                               | ตัวอย่างการตั้งค่า server-to-server                  |

ไม่มีการแก้ไฟล์ Payment, Identity, Catalog หรือกลไก Manager approval
ตาราง `insurances` และ FK เดิมคงอยู่เพื่ออ่านรายการเก่า การขายใหม่รับประกัน NOVA ผ่าน `novaPlanId`
หาก client เก่าส่ง `insuranceId` ที่ไม่ว่าง จะตอบ `INSURANCE_LEGACY_DISABLED` เพื่อไม่ขายประกันคนละระบบโดยไม่รู้ตัว
ก่อน migration หน้าอ่าน order เก่ายังทำงานได้ แต่การสร้าง order ที่เลือก NOVA ต้องรัน migration ก่อน

## เปิดใช้งานกับฐานข้อมูลที่ต้องการ

โค้ดและชุดทดสอบถูกตรวจด้วยฐานข้อมูลทดสอบแยก ไม่ได้ migrate หรือ deploy ฐานข้อมูล/บริการที่ใช้งานเดิม
ใช้ Node 24.x ตาม engines ของ repository

1. เพิ่มค่าใน `services/sales/.env`:

   ```dotenv
   NOVA_API_URL=http://localhost:3010/api
   NOVA_PARTNER_KEY=<random-secret-at-least-32-characters>
   ```

2. เพิ่ม `NOVA_PARTNER_KEY` ค่าเดียวกันใน `insurance/backend/.env` เก็บเฉพาะ Backend ห้ามใส่ `VITE_*`
   สร้างค่า random ได้ด้วย `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   Production ใช้ HTTPS และ URL ที่มี `/api` ห้ามใช้ public key สั้น ๆ หรือส่ง key ผ่าน URL

3. ตรวจให้ credentials ของแต่ละ service ชี้ database ที่ถูกต้อง โดย NOVA ต้องแยกจาก carshop แล้วรัน:

   ```powershell
   cd C:\SPU\CSI400\project\services\sales
   node scripts/migrate-insurance.js
   cd C:\SPU\CSI400\project\insurance\backend
   npm run migrate
   npm run seed
   ```

   Migration ทั้งสองฝั่งเพิ่มตารางและรันซ้ำได้ ไม่ drop/reset ข้อมูลเดิม

4. สร้างแอดมิน NOVA จาก shell ของ backend โดยกำหนด `NOVA_ADMIN_EMAIL` และ `NOVA_ADMIN_PASSWORD`
   (ในเครื่อง 8–256 ตัวอักษร, production 12–256) แล้วรัน `node scripts/create-admin.js` ไม่มีบัญชี default และไม่มี public registration
   ล้าง env รหัสผ่านจาก shell หลังสร้าง ระบบเก็บรหัสผ่านแบบ salted scrypt ไม่เก็บ plaintext

5. ตั้ง CORS ของแต่ละ service ให้ตรงกับ frontend origin แล้ว restart Sales และ NOVA backend
   rebuild/restart frontend ทั้งสองเว็บ แอดมินเข้า `/admin` บน NOVA ลูกค้าเข้า `/customer/insurance` บน carshop

## API ใหม่

Sales ใช้ session เดิมของ Identity:

- `GET /api/v1/insurance/plans`: Seller/Manager/Admin ดูแพ็กเกจและราคาสุทธิ ไม่ส่ง quote token ให้ browser
- `GET /api/v1/insurance/me`: Customer อ่านรายการของตัวเองเท่านั้น ไม่รับ customerId จาก browser
- `POST /api/v1/orders`: เพิ่ม `novaPlanId`, `deliveryDate`, `expectedPremium` หากไม่เลือกประกัน ส่ง `novaPlanId: null`

NOVA ใช้ `Authorization: Bearer <NOVA_PARTNER_KEY>` สำหรับ Backend carshop:

- `GET /api/partner/plans`: รายการแพ็กเกจ พร้อมราคาและ quote ที่มีลายเซ็น
- `POST /api/partner/requests`: รับ orderId, quoteToken, deliveryDate, customer, vehicle
- `GET /api/partner/requests/:orderId`: อ่านสถานะ/กรมธรรม์เพื่อนำกลับไปแสดงใน carshop

NOVA admin ใช้ session ของ NOVA แยกจาก key เชื่อมระบบ:

- `POST /api/admin/login`: email/password ส่งกลับ token อายุ 8 ชั่วโมง เก็บ hash ในฐานข้อมูล
- `POST /api/admin/logout`: ยกเลิก token ปัจจุบัน
- `GET /api/admin/requests?offset=0`: 50 รายการต่อหน้า
- `POST /api/admin/requests/:id/approve`: ออกกรมธรรม์ อนุมัติซ้ำได้ผลเดิม ไม่มี API ปฏิเสธ

ทุก response ที่มีข้อมูลส่วนตัวใช้ `Cache-Control: no-store`
หน้าแอดมินเก็บ token ใน sessionStorage ของแท็บ ไม่มี token/ข้อมูลส่วนตัวใน URL
Login จำกัด 10 ครั้งต่อ 15 นาทีต่อ IP (in-memory limiter เหมาะกับ deployment replica เดียว)

## การส่งซ้ำและการอัปเดต

ใช้สถานะใน `order_nova_insurance` เป็นงานส่งแบบถาวร ไม่ใช้ in-memory queue
Worker เริ่มเมื่อกำหนด NOVA URL และ key วนทุก 5 วินาที ส่งครั้งละไม่เกิน 10 รายการ
มี MySQL advisory lock กันหลาย replica ส่งพร้อมกัน การส่งล้มเหลวรอเพิ่มจาก 5 วินาทีถึงสูงสุด 5 นาที
บันทึกเฉพาะ error code ทั่วไป ไม่ log key หรือข้อมูลลูกค้า

NOVA มี unique order_id หาก response หายหลัง commit carshop ส่ง payload เดิมใหม่แล้วได้รับ request เดิม
ถ้า order เดิมแต่ payload ต่าง ตอบ 409 แทนการแก้คำขอเดิมอย่างเงียบ ๆ
ข้อมูลลูกค้า รถ และราคาเก็บ snapshot ตอนขาย จึงไม่เปลี่ยนตามข้อมูลปัจจุบันระหว่าง retry
Quote ไม่มีวันหมดอายุ เพราะต้องรับราคาของ order ที่ตกลงไว้แล้วแม้จ่ายเงินภายหลัง ควรรักษา key เดิมไว้จนรายการค้างถูกส่งครบก่อนหมุน key

สำหรับ production ที่ Sales อยู่บน Vercel ให้ตั้ง `CARSHOP_SALES_API_URL` บน NOVA Railway
เป็น `https://carshop-insurance-sales.vercel.app/api/v1` พร้อม `NOVA_PARTNER_KEY` ค่าเดียวกับ Sales
ตัวรัน NOVA เรียก `POST /api/v1/internal/insurance/sync` ทุก 5 วินาที โดยตรวจ key และส่งครั้งละไม่เกิน 2 รายการ
จึงไม่ต้องพึ่ง `services/sales/src/server.js` ซึ่ง Vercel ไม่เรียกใช้งาน และไม่ต้องเปิดหน้าลูกค้าค้างไว้
API นี้ไม่ใช้บัญชีลูกค้าและไม่อนุมัติการชำระเงิน ตรวจ `PAID`/`COMPLETED` จากฐานข้อมูลก่อนส่งเสมอ

เมื่อรออนุมัติ Sales อ่านผลทุกประมาณ 10–15 วินาที หน้าลูกค้า refresh ข้อมูลทุก 15 วินาที
จึงอาจใช้เวลาประมาณ 30 วินาทีให้ผลอนุมัติปรากฏ ไม่มี webhook หรือการเปลี่ยน Payment logic

การคืนเงิน/ยกเลิกกรมธรรม์อัตโนมัติยังอยู่นอก flow นี้ หาก order ถูกยกเลิก worker จะไม่ส่ง/ตรวจต่อ
หน้าลูกค้าแสดงคำสั่งซื้อยกเลิก แต่การคืนเงินใน carshop ไม่ได้ยกเลิกกรมธรรม์ที่ NOVA ออกไปแล้ว

## ตรวจสอบ

```powershell
# รันจาก root
node --test services/sales/test/*.test.js insurance/backend/test/core.test.js

# กำหนด URL ของฐานข้อมูลทดสอบสองแห่งที่แยกกัน ชื่อต้องลงท้าย _test
$env:CARSHOP_INSURANCE_TEST_DATABASE_URL='mysql://user:password@127.0.0.1:3306/carshop_nova_test'
$env:NOVA_PARTNER_TEST_DATABASE_URL='mysql://user:password@127.0.0.1:3306/nova_partner_test'
node --test scripts/test-insurance-integration.mjs

# เพิ่ม browser checks ใช้ Chrome และพอร์ต IPv4 5173/5174 ที่ว่าง
$env:INSURANCE_BROWSER_TEST='1'
node --test scripts/test-insurance-integration.mjs

npm --prefix apps/web run build
npm --prefix insurance/frontend run build
```

Integration สร้าง schema และข้อมูลตัวอย่างใน database ทดสอบที่กำหนดเท่านั้น เก็บ test rows ไว้ตรวจได้ ใช้ UUID ใหม่แต่ละครั้ง
Identity ใน integration เป็น test authority ส่วน Sales, Payment, NOVA, HTTP และ MySQL เป็นของจริง
Browser checks ตรวจ Seller เลือก/ไม่เลือกประกัน, ส่วนลด/วันส่งมอบ, หน้ากรมธรรม์บนมือถือ,
แอดมินเข้าสู่ระบบ/ออกจากระบบ และปิด checkout โดยตรง
ผลที่ตรวจผ่าน: Sales/NOVA regression 27 tests, Payment เดิม 16 tests, historical MySQL receipt test,
full HTTP/MySQL/browser integration, public-page Playwright 4 scenarios และ build ทั้งสองเว็บ
