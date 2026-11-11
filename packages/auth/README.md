# ตัวตรวจ session กลางของ CarShop

ใช้กับ Express ของ Sales, Catalog, Payment หรือ Reporting โดยไม่ต้องทำ Login ใหม่
และไม่ต้องแจก JWT_SECRET ให้บริการเหล่านั้น ตัวกลางส่ง token ไปยัง Identity
`GET /api/v1/users/me` ซึ่งตรวจ signature, issuer, audience, expiry, revocation
และสถานะบัญชีจาก DB อยู่แล้ว จากนั้นใช้ role ปัจจุบันจาก DB ไม่ใช่ role เก่าใน JWT

## สถานะการเชื่อม

มี middleware และ integration tests แล้ว แต่ยัง **ไม่ได้ติดตั้งใน business routes**
ของ Sales/Catalog/Payment/Reporting การเพิ่ม package นี้อย่างเดียวจึงยังไม่ปิดช่องโหว่
ที่พบใน UAT ต้องเชื่อมแต่ละ route และทดสอบ ownership กับเจ้าของ service ต่อ
Identity ใช้ตัวตรวจเดิมของตัวเอง ห้ามให้ Identity เรียกตัวกลางนี้ย้อนกลับหาตัวเอง

## ใช้งานจาก services/<ชื่อ>/src/app.js

ตั้ง `IDENTITY_API_URL=http://localhost:3001/api/v1` ใน env ของ service
URL นี้ต้องมาจาก configuration ที่เชื่อถือได้ ห้ามรับจาก request ของผู้ใช้
Production ใช้ HTTPS; HTTP อนุญาตเฉพาะ loopback สำหรับ local

```js
import {
  createRequireSession,
  requireRoles,
} from '../../../packages/auth/index.js';

const requireSession = createRequireSession({
  identityBaseUrl: process.env.IDENTITY_API_URL,
  allowedOrigins: env.corsOrigins,
  timeoutMs: 3000,
});

// ติดตั้ง cors ก่อน routes และเปิด credentials: true
// ใช้ origin allowlist ของ service ไม่ใช้ wildcard '*'
app.use('/api/v1/health', healthRoutes); // public
app.get('/api/v1/cars', listCars); // ตัวอย่าง public catalog

// ตัวอย่างเท่านั้น: ทีมต้องยืนยัน permission matrix ก่อนนำไปใช้จริง
app.post(
  '/api/v1/cars',
  requireSession,
  requireRoles('admin', 'stock'),
  createCar,
);
app.get(
  '/api/v1/my-appointments',
  requireSession,
  requireRoles('customer'),
  listMyAppointments,
);
```

`listCars`, `createCar`, `listMyAppointments` ในตัวอย่างแทน handler ของ service
ตัวกลางไม่มี dependency เพิ่ม ใช้ native fetch บน Node (repo กำหนด Node 24)
การ deploy service แยกต้องรวมไฟล์ `packages/auth/index.js` ใน bundle ด้วย

## ข้อมูลหลังผ่านการตรวจ

```js
req.user; // { id: '<users.id>', role: 'customer', status: 'active' }
req.auth; // { user: req.user, viaCookie: true หรือ false }
```

ไม่มี token, password หรือ JWT claims แนบใน object นี้ ไม่เชื่อข้อมูลจาก
`X-User-Id`, `X-User-Role`, body หรือ query ที่ client ส่งมา
`requireRoles(...)` ต้องอยู่หลัง `requireSession`; role ใช้ตัวพิมพ์เล็ก
และไม่มีข้อยกเว้นให้ admin โดยอัตโนมัติ ต้องใส่ admin ในรายการหากต้องการอนุญาต

## Ownership และกฎธุรกิจต้องตรวจเพิ่ม

การผ่าน JWT และ role ไม่ได้แปลว่าเข้าถึงทุกรายการได้ เจ้าของ service ต้อง:

- ใช้ `req.user.id` หา customer/employee ของผู้ Login; users.id ไม่ใช่ customers.id หรือ employees.id
- กรองรายการที่อ่านให้เป็นของผู้ใช้หรือพนักงานที่ได้รับมอบหมาย
- ตรวจเจ้าของรายการก่อนแก้ไข ไม่เชื่อ customerId/sellerId/assignedBy จาก body เพียงอย่างเดียว
- ตรวจสถานะที่เปลี่ยนได้ ยอดเงิน และเงื่อนไขธุรกิจใน transaction เดียวกับการเขียน
- ไม่ใช้ GET/HEAD ทำการเปลี่ยนข้อมูล

## Cookie และ CSRF

รองรับ `Authorization: Bearer <JWT>` และ cookie `carshop_identity_session`
หากมี Authorization จะใช้ header เท่านั้น ไม่ fallback ไป cookie เมื่อ header ผิด
cookie ชื่อซ้ำถูกปฏิเสธเพื่อไม่ให้เลือก token อย่างกำกวม

Frontend ที่เรียก service แบบ cookie ต้องตั้ง Axios `withCredentials: true`
หรือ fetch `credentials: 'include'`; Backend เปิด CORS `credentials: true`
และอนุญาต origin ของเว็บแบบตรงตัว CORS เพียงอย่างเดียวไม่ใช่การตรวจสิทธิ์

คำขอเขียนผ่าน cookie ต้องมี Origin ที่ตรงกับ allowedOrigins; หากไม่มีหรือผิดจะได้ 403
Bearer client ที่ไม่ใช่ browser ใช้ได้โดยไม่มี Origin แต่หากส่ง Origin มา จะตรวจ allowlist ด้วย
OPTIONS/preflight ให้ CORS จัดการก่อน auth middleware

Cookie ปัจจุบันเป็น HttpOnly, SameSite=Lax และ Path=/api/v1; cookie ไม่แยกตาม port
local ต้องใช้ hostname เดียวกันให้สอดคล้อง เช่น localhost ทุก service
Production ที่แยก hostname จะไม่รับ cookie host-only ของ Identity โดยอัตโนมัติ
ให้ใช้ same-origin reverse proxy/BFF และวางแผน routing กับทีมก่อน deploy
อย่าย้าย JWT ไป localStorage หรือถอด HttpOnly เพื่อแก้ปัญหานี้

## Error contract และ availability

| HTTP | code                 | ความหมาย                                                    |
| ---- | -------------------- | ----------------------------------------------------------- |
| 401  | UNAUTHORIZED         | ไม่มี credential หรือรูปแบบไม่ถูกต้อง                       |
| 401  | INVALID_TOKEN        | Identity ปฏิเสธ เช่น หมดอายุ Logout แล้ว หรือบัญชี inactive |
| 403  | FORBIDDEN            | role ไม่ได้รับอนุญาต                                        |
| 403  | FORBIDDEN_ORIGIN     | Origin ของคำขอเขียนไม่ผ่าน                                  |
| 503  | IDENTITY_UNAVAILABLE | Identity ติดต่อไม่ได้ timeout หรือส่ง response ผิด contract |

ส่ง JSON `{ error: { code, message } }` โดยตรง และตั้ง Cache-Control: no-store
ไม่มี cache ผลยืนยันตัวตน เพื่อให้การเปลี่ยน role/ระงับบัญชี/Logout มีผลกับคำขอถัดไป
คำขอที่ผ่านการตรวจไปก่อนการเปลี่ยนสถานะไม่ได้ถูกย้อนยกเลิก
Identity ล่มแล้ว service จะปฏิเสธคำขอที่ป้องกันไว้ด้วย 503 ไม่ปล่อยผ่าน
Frontend ต้องไม่ตีความ 503 ว่า Logout; แสดงให้ลองใหม่
มีค่าใช้จ่ายเพิ่มหนึ่ง HTTP call และการอ่าน DB ของ Identity ต่อคำขอที่ป้องกัน
ไม่ส่งต่อ cookie อื่น, Origin หรือ header ของผู้ใช้ทั้งหมดไป Identity และไม่ตาม redirect

## Test

```sh
npm --prefix services/identity test
```

ใช้ MySQL configuration ของ Identity แต่สร้างฐานชื่อสุ่มแยกและลบหลังทดสอบ
`services/identity/test/shared-auth.test.js` เปิด Identity และ service จำลองคนละ port
ทดสอบ bearer/cookie, token ปลอม/หมดอายุ, spoofed headers, CSRF, role เปลี่ยน,
ระงับบัญชี, Logout, upstream error/redirect/response ผิด และ timeout
พร้อมรัน regression เดิมของ Identity และ browser flow

ก่อน merge การเชื่อม service จริง ต้องเพิ่ม test ราย endpoint สำหรับ anonymous,
wrong role, wrong owner, allowed owner และยืนยันว่า request ที่ถูกปฏิเสธไม่เปลี่ยน DB
