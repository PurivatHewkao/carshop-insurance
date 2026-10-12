# reporting frontend — คนที่ 5 (อั้ม)

รับผิดชอบ รายงานและ Dashboard ยังเป็น placeholder ไม่มี business API/auth

## ไฟล์เจ้าของ

- routes.jsx: เพิ่ม route ของ feature ที่ export ให้ src/routes/index.jsx; path ปัจจุบัน /reporting
- api/client.js: Axios client ของ reporting เท่านั้น base URL รวม /api/v1 และเรียก relative endpoint เช่น health
- pages/PlaceholderPage.jsx: แทนหรือเพิ่ม pages เมื่อทำ feature จริง
- README.md: อัปเดตคู่มือและ dependencies

## เพิ่มงาน

เพิ่ม pages/_.jsx, components/_.jsx, hooks/use*.js และ api/*.js ตามงานที่ใช้จริง ไม่ต้องสร้างไฟล์เปล่าทุก layer
UI เรียก API ของ service ผ่าน client ไม่เชื่อม DB; src/lib/http.js เก็บ config ร่วมเท่านั้น

## ประสาน

Layout, common components, routes กลาง, styles, entry point, src/lib/http.js และ apps/web/package.json/package-lock.json ประสานคนที่ 5 (อั้ม) ก่อนแก้
ไม่แก้ src/features ของเพื่อนหรือ services ของเพื่อนโดยไม่ประสาน ดู docs/team-ownership.md
รันจาก root: npm run dev:web และ npm run dev:reporting; เมื่อติดตั้ง frontend เดี่ยว cd apps/web แล้ว npm install และ npm run dev

## งานเริ่มต้น

1. ตกลง UI, routes และ contracts ร่วมกับเจ้าของ services
2. พัฒนา Layout, Home และ Dashboard ตามสิทธิ์หลัง auth พร้อม
3. พัฒนา Reporting ผ่าน API ของ Sales/Payment/Catalog และ activity logs
4. ตรวจ integration โดยให้เจ้าของแต่ละ service แก้ปัญหาของตัวเอง
5. เตรียม 6 Vercel projects และทดลอง deploy เมื่อทีมอนุมัติในงานภายหลัง

พร้อม integrate เมื่อ routes ไม่มีชนกัน, contract ตรง backend, มี loading/empty/error และ validation/auth จริงตามขอบเขตที่ตกลง, build/lint ผ่าน และไม่มีข้อมูลสำเร็จปลอม
