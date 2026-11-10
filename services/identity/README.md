# identity service — คนที่ 1 (โจเซฟ)

รับผิดชอบ: บัญชีผู้ใช้และสิทธิ์ ดูคู่มือหลัก [team ownership](../../docs/team-ownership.md)

## JWT Auth แบบไม่ใช้ฐานข้อมูล

ทำงานแล้ว: POST `/api/v1/auth/register` (201), POST `/api/v1/auth/login` (200), POST `/api/v1/auth/logout` (204), GET/PATCH `/api/v1/users/me` (200)

Register รับ `{name,email,phone,password}` และ Login รับ `{email,password}`; ตอบ `{data:{user,accessToken}}` ทุก protected endpoint ใช้ `Authorization: Bearer <accessToken>` อ่าน/แก้โปรไฟล์ตอบ `{data:user}` และ Logout ยกเลิก JWT ปัจจุบัน ไม่มี refresh token

เก็บบัญชีใน Map เฉพาะ process ใช้ scrypt พร้อม random salt แฮชรหัสผ่าน ไม่เก็บ password จริงและไม่เชื่อม MySQL รีสตาร์ตแล้วบัญชีทั้งหมดหาย ใช้สำหรับพัฒนาเครื่องเดียว ยังไม่รองรับหลาย instances/serverless แบบถาวร

JWT ใช้ HS256 อายุ 1 ชั่วโมง ตรวจ signature, expiry, issuer, audience และสถานะบัญชี ทุกคนสมัครเป็น customer เท่านั้น ไม่มี seed admin; API รายการ/เปลี่ยนสิทธิ์ผู้ใช้ยังไม่ implement Profile เปลี่ยนได้เฉพาะชื่อและเบอร์โทร

Validation: ชื่อ 1–100 ตัว, email ไม่เกิน 254 ตัวและไม่ซ้ำโดยไม่แยกตัวพิมพ์, โทร 9–10 หลักขึ้นต้น 0, password 8–128 ตัวรวมอังกฤษและตัวเลข; จำกัด Login/Register รวม 30 ครั้ง/IP/15 นาที คืน 400/401/409/429 ตามกรณี

Development เริ่มได้โดยไม่มี `.env` โดยสุ่ม signing key ต่อ process; ตั้ง `JWT_SECRET` อย่างน้อย 32 bytes เมื่อจะใช้ key คงที่ Production ต้องมี key นี้และไม่อนุญาตให้ว่าง สร้างด้วย `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` แล้วใส่ใน `services/identity/.env` ห้ามใส่ใน VITE_ หรือ commit key

ทดสอบ Backend: `npm --prefix services/identity test` จาก root; Frontend/API integration: `node apps/web/src/features/identity/check-auth-api.mjs` (Node 24 ตามโครงการ)

## รันแยก

ใช้ Node.js 24 LTS: cd services/identity แล้ว npm install และ npm run dev (port 3001); npm start สำหรับรันโดยไม่ watch
คัดลอก .env.example เป็น .env เมื่อจะตั้งค่าฐานข้อมูล; health ทำงานได้แม้ไม่มี .env หรือ credentials
GET http://localhost:3001/api/v1/health ตอบ {"service":"identity","status":"ok"}; เป็น liveness ไม่รับรอง database

## ไฟล์ที่แก้และตำแหน่งเพิ่มงาน

- src/app.js: mount routes เมื่อ implement จริง; ห้ามเปิด port ที่นี่
- src/server.js: local listener; Vercel ใช้ default export จาก src/app.js
- src/config/env.js และ src/config/mysql.js: config และ lazy database connections
- src/modules/README.md: เพิ่ม module ของตัวเองเมื่อเริ่มงาน โดยแยก routes/controller/service/repository/validation ตามความจำเป็น
- src/middleware/errors.js: error และ 404 handlers; เพิ่ม auth middleware เมื่อ Identity contract พร้อม
- database/README.md: แนวทาง migrations/models; src/utils/README.md: helper ของ service
- package.json, package-lock.json, .env.example และ README.md: เจ้าของ service ดูแลเอง; ห้าม commit .env

## ลำดับเริ่มงาน

1. ตกลง user ID, roles และ auth contract กับทุกคน
2. ออกแบบ migrations ของบัญชีผู้ใช้
3. พัฒนา Register/Login พร้อม bcrypt, validation และ JWT
4. เชื่อมหน้า Profile และการจัดการสิทธิ์

ประสานคนที่ 5 (อั้ม) ก่อนแก้ tooling หรือ contract กลาง และประสานเจ้าของ service ที่เกี่ยวข้องก่อนเปลี่ยน API
ก่อนส่ง integrate: อัปเดต OpenAPI/contract, validation/auth ตามที่ตกลง, tests กรณีสำเร็จและผิดพลาด, .env.example และคู่มือ; health/lint/build ต้องผ่าน ไม่มี success ปลอม
เจ้าของ service ต้องเชื่อมและแก้ปัญหาของตัวเอง คนที่ 5 (อั้ม) ประสาน integration ไม่ทำแทนทุกคน
