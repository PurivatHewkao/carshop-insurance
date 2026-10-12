# identity frontend — คนที่ 1 (โจเซฟ)

รับผิดชอบ บัญชีผู้ใช้และสิทธิ์ ยังเป็น placeholder ไม่มี business API/auth

## ไฟล์เจ้าของ

- routes.jsx: เพิ่ม route ของ feature ที่ export ให้ src/routes/index.jsx; path ปัจจุบัน /identity
- api/client.js: Axios client ของ identity เท่านั้น base URL รวม /api/v1 และเรียก relative endpoint เช่น health
- pages/PlaceholderPage.jsx: แทนหรือเพิ่ม pages เมื่อทำ feature จริง
- README.md: อัปเดตคู่มือและ dependencies

## เพิ่มงาน

เพิ่ม pages/_.jsx, components/_.jsx, hooks/use*.js และ api/*.js ตามงานที่ใช้จริง ไม่ต้องสร้างไฟล์เปล่าทุก layer
UI เรียก API ของ service ผ่าน client ไม่เชื่อม DB; src/lib/http.js เก็บ config ร่วมเท่านั้น

## ประสาน

Layout, common components, routes กลาง, styles, entry point, src/lib/http.js และ apps/web/package.json/package-lock.json ประสานคนที่ 5 (อั้ม) ก่อนแก้
ไม่แก้ src/features ของเพื่อนหรือ services ของเพื่อนโดยไม่ประสาน ดู docs/team-ownership.md
รันจาก root: npm run dev:web และ npm run dev:identity; เมื่อติดตั้ง frontend เดี่ยว cd apps/web แล้ว npm install และ npm run dev

## งานเริ่มต้น

1. ตกลง user ID, roles และ auth contract กับทุกคน
2. ออกแบบ migrations ของบัญชีผู้ใช้
3. พัฒนา Register/Login พร้อม bcrypt, validation และ JWT
4. เชื่อมหน้า Profile และการจัดการสิทธิ์

พร้อม integrate เมื่อ routes ไม่มีชนกัน, contract ตรง backend, มี loading/empty/error และ validation/auth จริงตามขอบเขตที่ตกลง, build/lint ผ่าน และไม่มีข้อมูลสำเร็จปลอม
