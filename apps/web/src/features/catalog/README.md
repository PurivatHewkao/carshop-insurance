# catalog frontend — คนที่ 2 (กร)

รับผิดชอบ รายการรถและจัดการรถ ยังเป็น placeholder ไม่มี business API/auth

## ไฟล์เจ้าของ

- routes.jsx: เพิ่ม route ของ feature ที่ export ให้ src/routes/index.jsx; path ปัจจุบัน /catalog
- api/client.js: Axios client ของ catalog เท่านั้น base URL รวม /api/v1 และเรียก relative endpoint เช่น health
- pages/PlaceholderPage.jsx: แทนหรือเพิ่ม pages เมื่อทำ feature จริง
- README.md: อัปเดตคู่มือและ dependencies

## เพิ่มงาน

เพิ่ม pages/_.jsx, components/_.jsx, hooks/use*.js และ api/*.js ตามงานที่ใช้จริง ไม่ต้องสร้างไฟล์เปล่าทุก layer
UI เรียก API ของ service ผ่าน client ไม่เชื่อม DB; src/lib/http.js เก็บ config ร่วมเท่านั้น

## ประสาน

Layout, common components, routes กลาง, styles, entry point, src/lib/http.js และ apps/web/package.json/package-lock.json ประสานคนที่ 5 (อั้ม) ก่อนแก้
ไม่แก้ src/features ของเพื่อนหรือ services ของเพื่อนโดยไม่ประสาน ดู docs/team-ownership.md
รันจาก root: npm run dev:web และ npm run dev:catalog; เมื่อติดตั้ง frontend เดี่ยว cd apps/web แล้ว npm install และ npm run dev

## งานเริ่มต้น

1. ตกลง car ID, ราคา และ stock contract กับคนที่ 3 (เฟียร์)
2. ออกแบบ MySQL รถ รุ่น สต็อก โปรโมชั่น และ MongoDB รายละเอียดเทคนิค
3. พัฒนา API ค้นหา รายละเอียด และ CRUD พร้อม validation
4. เชื่อมหน้ารายการรถและหน้าจัดการสำหรับ Admin

พร้อม integrate เมื่อ routes ไม่มีชนกัน, contract ตรง backend, มี loading/empty/error และ validation/auth จริงตามขอบเขตที่ตกลง, build/lint ผ่าน และไม่มีข้อมูลสำเร็จปลอม
