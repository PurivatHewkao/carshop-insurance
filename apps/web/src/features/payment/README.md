# payment frontend — คนที่ 4 (ดิว)

รับผิดชอบ การเงินและชำระเงินจำลอง ยังเป็น placeholder ไม่มี business API/auth

## ไฟล์เจ้าของ

- routes.jsx: เพิ่ม route ของ feature ที่ export ให้ src/routes/index.jsx; path ปัจจุบัน /payment
- api/client.js: Axios client ของ payment เท่านั้น base URL รวม /api/v1 และเรียก relative endpoint เช่น health
- pages/PlaceholderPage.jsx: แทนหรือเพิ่ม pages เมื่อทำ feature จริง
- README.md: อัปเดตคู่มือและ dependencies

## เพิ่มงาน

เพิ่ม pages/_.jsx, components/_.jsx, hooks/use*.js และ api/*.js ตามงานที่ใช้จริง ไม่ต้องสร้างไฟล์เปล่าทุก layer
UI เรียก API ของ service ผ่าน client ไม่เชื่อม DB; src/lib/http.js เก็บ config ร่วมเท่านั้น

## ประสาน

Layout, common components, routes กลาง, styles, entry point, src/lib/http.js และ apps/web/package.json/package-lock.json ประสานคนที่ 5 (อั้ม) ก่อนแก้
ไม่แก้ src/features ของเพื่อนหรือ services ของเพื่อนโดยไม่ประสาน ดู docs/team-ownership.md
รันจาก root: npm run dev:web และ npm run dev:payment; เมื่อติดตั้ง frontend เดี่ยว cd apps/web แล้ว npm install และ npm run dev

## งานเริ่มต้น

1. ตกลง Order contract กับคนที่ 3 (เฟียร์) และออกแบบ payments/invoices/refunds
2. พัฒนา payment simulation พร้อม idempotency และตรวจยอดฝั่ง server
3. พัฒนา invoice และ refund simulation พร้อมสถานะ
4. เชื่อมประวัติชำระเงินและหน้าฝ่ายการเงิน

พร้อม integrate เมื่อ routes ไม่มีชนกัน, contract ตรง backend, มี loading/empty/error และ validation/auth จริงตามขอบเขตที่ตกลง, build/lint ผ่าน และไม่มีข้อมูลสำเร็จปลอม
