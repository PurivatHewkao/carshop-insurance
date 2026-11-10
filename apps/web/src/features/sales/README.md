# sales frontend — คนที่ 3 (เฟียร์)

รับผิดชอบ งานขายและคำสั่งซื้อ เชื่อม services/sales แล้ว (appointments, assignments, orders, approvals) ยังไม่มี auth จริง

## ไฟล์เจ้าของ

- routes.jsx: เพิ่ม route ของ feature ที่ export ให้ src/routes/index.jsx; path ปัจจุบัน /sales
- api/salesApi.js: ฟังก์ชันเรียก endpoint ทั้งหมดของ sales; api/actor.js: หาลูกค้า/พนักงานที่ใช้งานอยู่ (โหมดทดสอบจนกว่า Identity จะพร้อม)
- hooks/useSalesData.js, hooks/useOrderForm.js และ components/SalesState.jsx: loading/error และ logic ที่หลายหน้าใช้ร่วมกัน
- api/client.js: Axios client ของ sales เท่านั้น base URL รวม /api/v1 และเรียก relative endpoint เช่น health
- pages/PlaceholderPage.jsx: แทนหรือเพิ่ม pages เมื่อทำ feature จริง
- README.md: อัปเดตคู่มือและ dependencies

## เพิ่มงาน

เพิ่ม pages/_.jsx, components/_.jsx, hooks/use*.js และ api/*.js ตามงานที่ใช้จริง ไม่ต้องสร้างไฟล์เปล่าทุก layer
UI เรียก API ของ service ผ่าน client ไม่เชื่อม DB; src/lib/http.js เก็บ config ร่วมเท่านั้น

## ประสาน

Layout, common components, routes กลาง, styles, entry point, src/lib/http.js และ apps/web/package.json/package-lock.json ประสานคนที่ 5 (อั้ม) ก่อนแก้
ไม่แก้ src/features ของเพื่อนหรือ services ของเพื่อนโดยไม่ประสาน ดู docs/team-ownership.md
รันจาก root: npm run dev:web และ npm run dev:sales; เมื่อติดตั้ง frontend เดี่ยว cd apps/web แล้ว npm install และ npm run dev

## งานเริ่มต้น

1. พัฒนา Orders, Order items และสถานะก่อน โดยตกลง snapshot ราคาและ idempotency
2. พัฒนา Appointments และ Assignments พร้อมประสาน Identity/Catalog
3. พัฒนา Approval flow สำหรับ Manager
4. เชื่อม Seller, คำขอลูกค้า และหน้าติดตาม Order

พร้อม integrate เมื่อ routes ไม่มีชนกัน, contract ตรง backend, มี loading/empty/error และ validation/auth จริงตามขอบเขตที่ตกลง, build/lint ผ่าน และไม่มีข้อมูลสำเร็จปลอม
