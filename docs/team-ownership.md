# คู่มือกระจายงานทีม 5 คน

## ชื่อผู้รับผิดชอบตามภาพของทีม

| คนในโครงเดิม | ชื่อ   | งานในภาพ | ส่วนที่จับคู่ใน scaffold                                 |
| ------------ | ------ | -------- | -------------------------------------------------------- |
| 1            | โจเซฟ  | Auth     | Identity                                                 |
| 2            | กร     | Car      | Catalog                                                  |
| 3            | เฟียร์ | Sales    | Sales                                                    |
| 4            | ดิว    | Payment  | Payment                                                  |
| 5            | อั้ม   | Customer | คนที่ 5 ในโครงเดิมเป็น Reporting / UI กลาง / Integration |

การแก้ครั้งนี้เปลี่ยนชื่อผู้รับผิดชอบตามโครงเดิมเท่านั้น ยังไม่เปลี่ยน services หรือขอบเขตงาน ในภาพอั้มรับผิดชอบ Customer ซึ่งยังไม่มี service แยกใน scaffold; งาน Reporting/UI กลางที่ระบุชื่ออั้มเป็นการจับคู่กับคนที่ 5 เดิม ต้องตกลงขอบเขตกับทีมก่อนเริ่มพัฒนา ไม่ถือว่า Customer และ Reporting เป็นงานเดียวกัน

ชื่อเหล่านี้เป็นชื่อเล่น ไม่ใช่ GitHub handles; ดู comments ใน .github/CODEOWNERS และเติมบัญชีจริงก่อนใช้เลือก reviewer อัตโนมัติ

## สรุปเร็ว: แต่ละคนต้องแก้ไฟล์อะไร

ทุก path ในหัวข้อนี้อ้างอิงจาก root ของ repository แก้เฉพาะ feature และ service ของตัวเอง ส่วนไฟล์กลางให้ประสานคนที่ 5 (อั้ม) ก่อนแก้

| คน         | งาน                                     | Frontend ของตัวเอง                 | Backend ของตัวเอง     |
| ---------- | --------------------------------------- | ---------------------------------- | --------------------- |
| 1 (โจเซฟ)  | บัญชีผู้ใช้ / Login / Register / สิทธิ์ | `apps/web/src/features/identity/`  | `services/identity/`  |
| 2 (กร)     | รถยนต์ / รุ่น / สต็อก / โปรโมชั่น       | `apps/web/src/features/catalog/`   | `services/catalog/`   |
| 3 (เฟียร์) | Orders / นัดหมาย / Seller / อนุมัติ     | `apps/web/src/features/sales/`     | `services/sales/`     |
| 4 (ดิว)    | ชำระเงินจำลอง / Invoice / Refund        | `apps/web/src/features/payment/`   | `services/payment/`   |
| 5 (อั้ม)   | Reporting / UI กลาง / Integration       | `apps/web/src/features/reporting/` | `services/reporting/` |

### ไฟล์ Frontend ที่ทุกคนต้องแก้ใน feature ของตัวเอง

นำชื่อไฟล์ด้านล่างต่อท้ายโฟลเดอร์ Frontend ในตาราง เช่น คนที่ 1 (โจเซฟ) แก้ `apps/web/src/features/identity/routes.jsx`

| ไฟล์ที่มีอยู่แล้ว           | ใช้ทำอะไร                                                    |
| --------------------------- | ------------------------------------------------------------ |
| `pages/PlaceholderPage.jsx` | เปลี่ยนเป็นหน้าจริง หรือเพิ่มหน้าใน `pages/` เมื่อเริ่มพัฒนา |
| `routes.jsx`                | เพิ่ม routes ของ feature แล้ว export ให้ routes กลางนำไปใช้  |
| `api/client.js`             | ดูแล Axios client ของ service ตัวเอง; base URL รวม `/api/v1` |
| `README.md`                 | อัปเดตวิธีใช้งานและรายละเอียดงาน                             |

เพิ่ม API functions ใน `api/` และเพิ่ม `components/`, `hooks/` เมื่อมีงานที่ใช้จริง โฟลเดอร์เหล่านี้ไม่จำเป็นต้องสร้างไว้เปล่า ๆ

### ไฟล์ Backend ที่ทุกคนต้องแก้ใน service ของตัวเอง

นำชื่อไฟล์ด้านล่างต่อท้ายโฟลเดอร์ Backend ในตาราง เช่น คนที่ 3 (เฟียร์) แก้ `services/sales/src/app.js`

| ไฟล์ที่มีอยู่แล้ว                   | ใช้ทำอะไร                                                          |
| ----------------------------------- | ------------------------------------------------------------------ |
| `src/app.js`                        | ลงทะเบียน business routes ที่พัฒนาเพิ่ม; ไม่เปิด port ในไฟล์นี้    |
| `src/modules/README.md`             | อ่านแนวทางก่อนเพิ่ม modules ของตัวเอง เช่น users, cars หรือ orders |
| `src/config/env.js`                 | เพิ่ม configuration ที่ใช้งานจริง                                  |
| `src/middleware/errors.js`          | ปรับ error handling ตาม API contract                               |
| `database/README.md`                | ระบุแนวทาง migrations หรือ MongoDB models ของ service              |
| `.env.example`                      | เพิ่มชื่อตัวแปรที่ต้องใช้ พร้อม placeholder ไม่มี secrets จริง     |
| `package.json`, `package-lock.json` | ดูแล dependencies และ lockfile ของ service ตัวเอง                  |
| `README.md`                         | อัปเดตวิธีติดตั้ง รัน และเชื่อมต่อ service                         |

สร้าง business modules ใหม่ใต้ `src/modules/` ตามความจำเป็น โดยแยก routes, controller, service, repository และ validation เมื่อใช้งานจริง

### ไฟล์ฐานข้อมูลและ clients ที่แต่ละคนดูแลเพิ่มเติม

| คน         | ไฟล์ config ที่มีอยู่แล้ว                                                        | ตำแหน่งเพิ่ม HTTP clients เมื่อ contract พร้อม                                                     |
| ---------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1 (โจเซฟ)  | `services/identity/src/config/mysql.js`                                          | ยังไม่มี dependency ที่ต้องเรียก service อื่นใน scaffold                                           |
| 2 (กร)     | `services/catalog/src/config/mysql.js`, `services/catalog/src/config/mongodb.js` | ยังไม่มี dependency ที่ต้องเรียก service อื่นใน scaffold                                           |
| 3 (เฟียร์) | `services/sales/src/config/mysql.js`                                             | เพิ่ม Catalog client ใน `services/sales/src/clients/` ตาม README ที่มีอยู่                         |
| 4 (ดิว)    | `services/payment/src/config/mysql.js`                                           | เพิ่ม Sales client ใน `services/payment/src/clients/` ตาม README ที่มีอยู่                         |
| 5 (อั้ม)   | `services/reporting/src/config/mongodb.js`                                       | เพิ่ม Sales, Payment และ Catalog clients ใน `services/reporting/src/clients/` ตาม README ที่มีอยู่ |

### ไฟล์ Frontend กลางที่คนที่ 5 (อั้ม) ดูแลเพิ่มเติม

- `apps/web/src/app/main.jsx` — entry point
- `apps/web/src/routes/index.jsx` — รวม routes ของทุก feature
- `apps/web/src/layouts/AppLayout.jsx` — layout และเมนู
- `apps/web/src/components/common/FeaturePlaceholder.jsx` — component กลางที่มีอยู่; ดูแล common components ที่เพิ่มภายหลังด้วย
- `apps/web/src/pages/HomePage.jsx` — Home
- `apps/web/src/pages/SystemStatusPage.jsx` — สถานะ services
- `apps/web/src/pages/NotFoundPage.jsx` — หน้าไม่พบเส้นทาง
- `apps/web/src/styles/index.css` — styles กลาง
- `apps/web/src/lib/http.js` — HTTP configuration และ health helper ที่ใช้ร่วมกัน

### ไฟล์กลางที่ทุกคนต้องประสานก่อนแก้

- `package.json`, `package-lock.json`, `scripts/setup.mjs`, `scripts/smoke.mjs`
- `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.nvmrc`, `.node-version`
- `apps/web/package.json`, `apps/web/package-lock.json`, `apps/web/vite.config.js`, `apps/web/index.html`, `apps/web/vercel.json`, `apps/web/.env.example`
- ไฟล์ Frontend กลางในรายการข้างบน และ `docs/api-contracts.md`

ทุกคนเสนอแก้ไฟล์กลางผ่าน PR ได้ โดยประสานคนที่ 5 (อั้ม) และเจ้าของงานที่เกี่ยวข้องก่อน ไม่แก้โฟลเดอร์ของเพื่อนโดยไม่คุยกับเจ้าของ คนที่ 5 (อั้ม) เป็นผู้ประสาน integration ส่วนแต่ละคนยังรับผิดชอบการเชื่อมและแก้ปัญหาของ service ตัวเอง

รายละเอียดหน้าที่ ลำดับเริ่มงาน และเกณฑ์พร้อมส่ง integrate ของแต่ละคนอยู่ในหัวข้อถัดไป

โครงนี้ทำงานเฉพาะ Home, routing, System Status และ health ของ 5 services ส่วนธุรกิจยังไม่ได้พัฒนา
ทุก path ในตารางเป็น relative จาก root และมีไฟล์จริงใน scaffold; path สำหรับไฟล์ใหม่ด้านล่างเป็นคำแนะนำในอนาคต

## ตาราง ownership

| คน         | หน้าที่                 | Frontend ที่เป็นเจ้าของ          | Backend ที่เป็นเจ้าของ | README ประจำงาน                                                            |
| ---------- | ----------------------- | -------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| 1 (โจเซฟ)  | บัญชีผู้ใช้และสิทธิ์    | apps/web/src/features/identity/  | services/identity/     | apps/web/src/features/identity/README.md และ services/identity/README.md   |
| 2 (กร)     | รายการรถและจัดการรถ     | apps/web/src/features/catalog/   | services/catalog/      | apps/web/src/features/catalog/README.md และ services/catalog/README.md     |
| 3 (เฟียร์) | งานขายและคำสั่งซื้อ     | apps/web/src/features/sales/     | services/sales/        | apps/web/src/features/sales/README.md และ services/sales/README.md         |
| 4 (ดิว)    | การเงินและชำระเงินจำลอง | apps/web/src/features/payment/   | services/payment/      | apps/web/src/features/payment/README.md และ services/payment/README.md     |
| 5 (อั้ม)   | รายงานและ Dashboard     | apps/web/src/features/reporting/ | services/reporting/    | apps/web/src/features/reporting/README.md และ services/reporting/README.md |

แต่ละคนดูแล package.json และ package-lock.json ของ service ตัวเอง; Frontend มี package/lockfile เดียวให้ประสานคนที่ 5 (อั้ม)
คนที่ 5 (อั้ม) เป็นผู้ประสาน integration ไม่ใช่ผู้ทำแทนทุกคน เจ้าของงานต้องเชื่อมและแก้ปัญหา service ของตัวเอง

## คนที่ 1 (โจเซฟ): บัญชีผู้ใช้และสิทธิ์

หน้าที่: Login, Register, Profile, บัญชีผู้ใช้, password hashing, JWT, roles/permissions; ใช้ MySQL carshop_identity

### ไฟล์ที่แก้เป็นประจำ

- apps/web/src/features/identity/routes.jsx
- apps/web/src/features/identity/pages/PlaceholderPage.jsx
- apps/web/src/features/identity/api/client.js
- apps/web/src/features/identity/README.md
- services/identity/src/app.js และ src/config/env.js
- services/identity/src/config/mysql.js
- services/identity/src/modules/README.md, database/README.md, README.md และ .env.example
- services/identity/package.json และ package-lock.json

### ตำแหน่งเพิ่มไฟล์เมื่อเริ่ม feature

เพิ่ม pages, components, hooks และ api functions ภายใต้ apps/web/src/features/identity/ เมื่อมีงานจริง
เพิ่ม module ใน services/identity/src/modules/ ตาม routes → controller → service → repository และ validation โดยไม่สร้าง layer เปล่าที่ไม่ใช้
เพิ่ม SQL migrations ใน services/identity/database/migrations/ เมื่อทีมตกลง schema

### การประสานงานและไฟล์ที่ควรหลีกเลี่ยง

ประสานทุกคนเรื่อง user ID, token, roles และ auth errors; คนที่ 3 (เฟียร์) ใช้ Seller/Manager IDs; คนที่ 5 (อั้ม) เชื่อม dashboard และ auth UI
ประสานคนที่ 5 (อั้ม) ก่อนแก้ไฟล์ส่วนกลางในตารางด้านล่าง ทุกคนเสนอ PR ได้
ห้ามแก้ services/catalog/ หรือ apps/web/src/features/catalog/, services/sales/ หรือ apps/web/src/features/sales/, services/payment/ หรือ apps/web/src/features/payment/, services/reporting/ หรือ apps/web/src/features/reporting/ โดยไม่ประสานเจ้าของ

### คำสั่งเฉพาะงาน

จาก root: npm run dev:web และ npm run dev:identity
รัน service เดี่ยว: cd services/identity, npm install, npm run dev (port 3001); npm start สำหรับไม่ watch
Frontend เดี่ยว: cd apps/web, npm install, npm run dev (port 5173)

### งานเริ่มต้นเรียงลำดับ

1. ตกลง user ID, roles และ auth contract กับทุกคน
2. ออกแบบ migrations ของบัญชีผู้ใช้
3. พัฒนา Register/Login พร้อม bcrypt, validation และ JWT
4. เชื่อมหน้า Profile และการจัดการสิทธิ์

### เกณฑ์พร้อมส่ง integrate

- API contract และ OpenAPI ที่เริ่มเพิ่มตรงกับ implementation รวม auth, request, response และ errors
- ฝั่ง UI มี routes ไม่ชนกัน มี loading/empty/error และเรียก service ตัวเองจริง
- มี validation และตรวจสิทธิ์จริงสำหรับ business endpoint ที่เริ่มพัฒนา ไม่มี mock success ปะปน production
- ทดสอบกรณีสำเร็จ/ผิดพลาดตามความเสี่ยง; health, root lint และ frontend build ผ่าน
- .env.example และ README อัปเดต ไม่มี secret; เจ้าของทำ integration กับ dependencies ก่อนส่งให้คนที่ 5 (อั้ม)

## คนที่ 2 (กร): รายการรถและจัดการรถ

หน้าที่: รายการ/ค้นหา/กรอง/รายละเอียดรถ และ Admin จัดการรถ รุ่น สต็อก โปรโมชั่น; MySQL carshop_catalog และ MongoDB carshop_catalog_documents

### ไฟล์ที่แก้เป็นประจำ

- apps/web/src/features/catalog/routes.jsx
- apps/web/src/features/catalog/pages/PlaceholderPage.jsx
- apps/web/src/features/catalog/api/client.js
- apps/web/src/features/catalog/README.md
- services/catalog/src/app.js และ src/config/env.js
- services/catalog/src/config/mysql.js และ src/config/mongodb.js
- services/catalog/src/modules/README.md, database/README.md, README.md และ .env.example
- services/catalog/package.json และ package-lock.json

### ตำแหน่งเพิ่มไฟล์เมื่อเริ่ม feature

เพิ่ม pages, components, hooks และ api functions ภายใต้ apps/web/src/features/catalog/ เมื่อมีงานจริง
เพิ่ม module ใน services/catalog/src/modules/ ตาม routes → controller → service → repository และ validation โดยไม่สร้าง layer เปล่าที่ไม่ใช้
เพิ่ม SQL migrations ใน services/catalog/database/migrations/ เมื่อทีมตกลง schema
เพิ่ม MongoDB models ใน services/catalog/src/modules/<module>/models/

### การประสานงานและไฟล์ที่ควรหลีกเลี่ยง

ประสานคนที่ 3 (เฟียร์) เรื่องข้อมูลรถ snapshot ราคา การจอง/ตัด/คืน stock และ concurrency; คนที่ 5 (อั้ม) เรื่อง report contracts
ประสานคนที่ 5 (อั้ม) ก่อนแก้ไฟล์ส่วนกลางในตารางด้านล่าง ทุกคนเสนอ PR ได้
ห้ามแก้ services/identity/ หรือ apps/web/src/features/identity/, services/sales/ หรือ apps/web/src/features/sales/, services/payment/ หรือ apps/web/src/features/payment/, services/reporting/ หรือ apps/web/src/features/reporting/ โดยไม่ประสานเจ้าของ

### คำสั่งเฉพาะงาน

จาก root: npm run dev:web และ npm run dev:catalog
รัน service เดี่ยว: cd services/catalog, npm install, npm run dev (port 3002); npm start สำหรับไม่ watch
Frontend เดี่ยว: cd apps/web, npm install, npm run dev (port 5173)

### งานเริ่มต้นเรียงลำดับ

1. ตกลง car ID, ราคา และ stock contract กับคนที่ 3 (เฟียร์)
2. ออกแบบ MySQL รถ รุ่น สต็อก โปรโมชั่น และ MongoDB รายละเอียดเทคนิค
3. พัฒนา API ค้นหา รายละเอียด และ CRUD พร้อม validation
4. เชื่อมหน้ารายการรถและหน้าจัดการสำหรับ Admin

### เกณฑ์พร้อมส่ง integrate

- API contract และ OpenAPI ที่เริ่มเพิ่มตรงกับ implementation รวม auth, request, response และ errors
- ฝั่ง UI มี routes ไม่ชนกัน มี loading/empty/error และเรียก service ตัวเองจริง
- มี validation และตรวจสิทธิ์จริงสำหรับ business endpoint ที่เริ่มพัฒนา ไม่มี mock success ปะปน production
- ทดสอบกรณีสำเร็จ/ผิดพลาดตามความเสี่ยง; health, root lint และ frontend build ผ่าน
- .env.example และ README อัปเดต ไม่มี secret; เจ้าของทำ integration กับ dependencies ก่อนส่งให้คนที่ 5 (อั้ม)

## คนที่ 3 (เฟียร์): งานขายและคำสั่งซื้อ

หน้าที่: Orders/Order items, Appointments, Assignments, คำขอลูกค้า, Seller และ Manager approvals; MySQL carshop_sales

### ไฟล์ที่แก้เป็นประจำ

- apps/web/src/features/sales/routes.jsx
- apps/web/src/features/sales/pages/PlaceholderPage.jsx
- apps/web/src/features/sales/api/client.js
- apps/web/src/features/sales/README.md
- services/sales/src/app.js และ src/config/env.js
- services/sales/src/config/mysql.js
- services/sales/src/modules/README.md, database/README.md, README.md และ .env.example
- services/sales/package.json และ package-lock.json
- services/sales/src/clients/README.md

### ตำแหน่งเพิ่มไฟล์เมื่อเริ่ม feature

เพิ่ม pages, components, hooks และ api functions ภายใต้ apps/web/src/features/sales/ เมื่อมีงานจริง
เพิ่ม module ใน services/sales/src/modules/ ตาม routes → controller → service → repository และ validation โดยไม่สร้าง layer เปล่าที่ไม่ใช้
เพิ่ม SQL migrations ใน services/sales/database/migrations/ เมื่อทีมตกลง schema

### การประสานงานและไฟล์ที่ควรหลีกเลี่ยง

เรียก Catalog ของคนที่ 2 (กร) ผ่าน HTTP; ประสานคนที่ 1 (โจเซฟ) เรื่องผู้ใช้/สิทธิ์ คนที่ 4 (ดิว) เรื่องยอดและสถานะ Order และคนที่ 5 (อั้ม) เรื่องรายงาน
ประสานคนที่ 5 (อั้ม) ก่อนแก้ไฟล์ส่วนกลางในตารางด้านล่าง ทุกคนเสนอ PR ได้
ห้ามแก้ services/identity/ หรือ apps/web/src/features/identity/, services/catalog/ หรือ apps/web/src/features/catalog/, services/payment/ หรือ apps/web/src/features/payment/, services/reporting/ หรือ apps/web/src/features/reporting/ โดยไม่ประสานเจ้าของ

### คำสั่งเฉพาะงาน

จาก root: npm run dev:web และ npm run dev:sales
รัน service เดี่ยว: cd services/sales, npm install, npm run dev (port 3003); npm start สำหรับไม่ watch
Frontend เดี่ยว: cd apps/web, npm install, npm run dev (port 5173)

### งานเริ่มต้นเรียงลำดับ

1. พัฒนา Orders, Order items และสถานะก่อน โดยตกลง snapshot ราคาและ idempotency
2. พัฒนา Appointments และ Assignments พร้อมประสาน Identity/Catalog
3. พัฒนา Approval flow สำหรับ Manager
4. เชื่อม Seller, คำขอลูกค้า และหน้าติดตาม Order

### เกณฑ์พร้อมส่ง integrate

- API contract และ OpenAPI ที่เริ่มเพิ่มตรงกับ implementation รวม auth, request, response และ errors
- ฝั่ง UI มี routes ไม่ชนกัน มี loading/empty/error และเรียก service ตัวเองจริง
- มี validation และตรวจสิทธิ์จริงสำหรับ business endpoint ที่เริ่มพัฒนา ไม่มี mock success ปะปน production
- ทดสอบกรณีสำเร็จ/ผิดพลาดตามความเสี่ยง; health, root lint และ frontend build ผ่าน
- .env.example และ README อัปเดต ไม่มี secret; เจ้าของทำ integration กับ dependencies ก่อนส่งให้คนที่ 5 (อั้ม)

## คนที่ 4 (ดิว): การเงินและชำระเงินจำลอง

หน้าที่: ชำระเงินจำลอง ประวัติ ใบแจ้งหนี้ ฝ่ายการเงิน และคืนเงินจำลอง; MySQL carshop_payment

### ไฟล์ที่แก้เป็นประจำ

- apps/web/src/features/payment/routes.jsx
- apps/web/src/features/payment/pages/PlaceholderPage.jsx
- apps/web/src/features/payment/api/client.js
- apps/web/src/features/payment/README.md
- services/payment/src/app.js และ src/config/env.js
- services/payment/src/config/mysql.js
- services/payment/src/modules/README.md, database/README.md, README.md และ .env.example
- services/payment/package.json และ package-lock.json
- services/payment/src/clients/README.md

### ตำแหน่งเพิ่มไฟล์เมื่อเริ่ม feature

เพิ่ม pages, components, hooks และ api functions ภายใต้ apps/web/src/features/payment/ เมื่อมีงานจริง
เพิ่ม module ใน services/payment/src/modules/ ตาม routes → controller → service → repository และ validation โดยไม่สร้าง layer เปล่าที่ไม่ใช้
เพิ่ม SQL migrations ใน services/payment/database/migrations/ เมื่อทีมตกลง schema

### การประสานงานและไฟล์ที่ควรหลีกเลี่ยง

เรียก Sales ของคนที่ 3 (เฟียร์) เพื่อขอ Order และแจ้งผลชำระเงิน; ประสานคนที่ 1 (โจเซฟ) เรื่องสิทธิ์การเงิน และคนที่ 5 (อั้ม) เรื่อง reports
ประสานคนที่ 5 (อั้ม) ก่อนแก้ไฟล์ส่วนกลางในตารางด้านล่าง ทุกคนเสนอ PR ได้
ห้ามแก้ services/identity/ หรือ apps/web/src/features/identity/, services/catalog/ หรือ apps/web/src/features/catalog/, services/sales/ หรือ apps/web/src/features/sales/, services/reporting/ หรือ apps/web/src/features/reporting/ โดยไม่ประสานเจ้าของ

### คำสั่งเฉพาะงาน

จาก root: npm run dev:web และ npm run dev:payment
รัน service เดี่ยว: cd services/payment, npm install, npm run dev (port 3004); npm start สำหรับไม่ watch
Frontend เดี่ยว: cd apps/web, npm install, npm run dev (port 5173)

### งานเริ่มต้นเรียงลำดับ

1. ตกลง Order contract กับคนที่ 3 (เฟียร์) และออกแบบ payments/invoices/refunds
2. พัฒนา payment simulation พร้อม idempotency และตรวจยอดฝั่ง server
3. พัฒนา invoice และ refund simulation พร้อมสถานะ
4. เชื่อมประวัติชำระเงินและหน้าฝ่ายการเงิน

### เกณฑ์พร้อมส่ง integrate

- API contract และ OpenAPI ที่เริ่มเพิ่มตรงกับ implementation รวม auth, request, response และ errors
- ฝั่ง UI มี routes ไม่ชนกัน มี loading/empty/error และเรียก service ตัวเองจริง
- มี validation และตรวจสิทธิ์จริงสำหรับ business endpoint ที่เริ่มพัฒนา ไม่มี mock success ปะปน production
- ทดสอบกรณีสำเร็จ/ผิดพลาดตามความเสี่ยง; health, root lint และ frontend build ผ่าน
- .env.example และ README อัปเดต ไม่มี secret; เจ้าของทำ integration กับ dependencies ก่อนส่งให้คนที่ 5 (อั้ม)

## คนที่ 5 (อั้ม): รายงานและ Dashboard

หน้าที่: Reporting ผ่าน APIs, activity logs ใน MongoDB carshop_reporting; Layout, Home, Dashboard ตามสิทธิ์, System Status, routes, UI, tooling และ Vercel

### ไฟล์ที่แก้เป็นประจำ

- apps/web/src/features/reporting/routes.jsx
- apps/web/src/features/reporting/pages/PlaceholderPage.jsx
- apps/web/src/features/reporting/api/client.js
- apps/web/src/features/reporting/README.md
- services/reporting/src/app.js และ src/config/env.js
- services/reporting/src/config/mongodb.js
- services/reporting/src/modules/README.md, database/README.md, README.md และ .env.example
- services/reporting/package.json และ package-lock.json
- services/reporting/src/clients/README.md

### ตำแหน่งเพิ่มไฟล์เมื่อเริ่ม feature

เพิ่ม pages, components, hooks และ api functions ภายใต้ apps/web/src/features/reporting/ เมื่อมีงานจริง
เพิ่ม module ใน services/reporting/src/modules/ ตาม routes → controller → service → repository และ validation โดยไม่สร้าง layer เปล่าที่ไม่ใช้
เพิ่ม MongoDB models ใน services/reporting/src/modules/<module>/models/

### การประสานงานและไฟล์ที่ควรหลีกเลี่ยง

เรียก Sales ของเฟียร์, Payment ของดิว และ Catalog ของกรตาม contract; ประสานโจเซฟเรื่อง Identity และ roles; เจ้าของ services แก้ service ของตัวเอง
ประสานคนที่ 5 (อั้ม) ก่อนแก้ไฟล์ส่วนกลางในตารางด้านล่าง ทุกคนเสนอ PR ได้
ห้ามแก้ services/identity/ หรือ apps/web/src/features/identity/, services/catalog/ หรือ apps/web/src/features/catalog/, services/sales/ หรือ apps/web/src/features/sales/, services/payment/ หรือ apps/web/src/features/payment/ โดยไม่ประสานเจ้าของ

### คำสั่งเฉพาะงาน

จาก root: npm run dev:web และ npm run dev:reporting
รัน service เดี่ยว: cd services/reporting, npm install, npm run dev (port 3005); npm start สำหรับไม่ watch
Frontend เดี่ยว: cd apps/web, npm install, npm run dev (port 5173)

### งานเริ่มต้นเรียงลำดับ

1. ตกลง UI, routes และ contracts ร่วมกับเจ้าของ services
2. พัฒนา Layout, Home และ Dashboard ตามสิทธิ์หลัง auth พร้อม
3. พัฒนา Reporting ผ่าน API ของ Sales/Payment/Catalog และ activity logs
4. ตรวจ integration โดยให้เจ้าของแต่ละ service แก้ปัญหาของตัวเอง
5. เตรียม 6 Vercel projects และทดลอง deploy เมื่อทีมอนุมัติในงานภายหลัง

### เกณฑ์พร้อมส่ง integrate

- API contract และ OpenAPI ที่เริ่มเพิ่มตรงกับ implementation รวม auth, request, response และ errors
- ฝั่ง UI มี routes ไม่ชนกัน มี loading/empty/error และเรียก service ตัวเองจริง
- มี validation และตรวจสิทธิ์จริงสำหรับ business endpoint ที่เริ่มพัฒนา ไม่มี mock success ปะปน production
- ทดสอบกรณีสำเร็จ/ผิดพลาดตามความเสี่ยง; health, root lint และ frontend build ผ่าน
- .env.example และ README อัปเดต ไม่มี secret; เจ้าของทำ integration กับ dependencies ก่อนส่งให้คนที่ 5 (อั้ม)

## ไฟล์กลาง — คนที่ 5 (อั้ม) ประสาน

| ไฟล์/โฟลเดอร์จริง                                                                                        | ผู้ประสาน                      | เหตุผล/ผู้เกี่ยวข้อง                                      |
| -------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| package.json, package-lock.json, scripts/setup.mjs, scripts/smoke.mjs                                    | คนที่ 5 (อั้ม)                 | คำสั่งและตรวจระบบทั้งทีม                                  |
| eslint.config.js, .prettierrc.json, .prettierignore, .gitignore, .nvmrc, .node-version                   | คนที่ 5 (อั้ม)                 | tooling และ Node version                                  |
| apps/web/package.json, apps/web/package-lock.json, vite.config.js, index.html, vercel.json, .env.example | คนที่ 5 (อั้ม)                 | frontend dependency/build/deploy/env ที่ใช้ร่วมกัน        |
| apps/web/src/app/main.jsx                                                                                | คนที่ 5 (อั้ม)                 | entry point                                               |
| apps/web/src/routes/index.jsx                                                                            | คนที่ 5 (อั้ม)                 | route integration; คนที่ 1–4 แก้ feature routes ของตัวเอง |
| apps/web/src/layouts/AppLayout.jsx                                                                       | คนที่ 5 (อั้ม)                 | navigation/layout ร่วม                                    |
| apps/web/src/components/common/FeaturePlaceholder.jsx                                                    | คนที่ 5 (อั้ม)                 | common UI                                                 |
| apps/web/src/styles/index.css, apps/web/src/lib/http.js                                                  | คนที่ 5 (อั้ม)                 | global styles/HTTP configuration                          |
| apps/web/src/pages/                                                                                      | คนที่ 5 (อั้ม)                 | Home, SystemStatusPage, NotFoundPage                      |
| docs/api-contracts.md, docs/database-ownership.md, docs/architecture.md                                  | คนที่ 5 (อั้ม) + เจ้าของ APIs  | ทุกคนเสนอแก้สัญญา API และขอบเขตข้อมูล                     |
| README.md, docs/, .github/CODEOWNERS                                                                     | คนที่ 5 (อั้ม) + ผู้เกี่ยวข้อง | คู่มือการทำงานและ ownership                               |

Root lint ต้องติดตั้ง root dependencies; frontend/service ยังคงติดตั้งและรันเดี่ยวได้โดยไม่พึ่ง root package
.github/CODEOWNERS บันทึกชื่อเล่นและ ownership เป็น comments; ต้องเติม GitHub handles จริงที่มีสิทธิ์ repository และเปิดใช้งาน rules ก่อนใช้ required review ห้ามใช้ชื่อเล่นแทน handles หรือเดาบัญชี
