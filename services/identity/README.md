# identity service — คนที่ 1 (โจเซฟ)

รับผิดชอบ: บัญชีผู้ใช้และสิทธิ์ ดูคู่มือหลัก [team ownership](../../docs/team-ownership.md)

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
