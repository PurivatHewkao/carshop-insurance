# React frontend ร่วมกัน

เจ้าของแต่ละ feature: คนที่ 1–5 ตาม src/features/<service>/README.md; คนที่ 5 (อั้ม) ดูแลการประสานไฟล์กลาง
ใช้ Node.js 24 LTS แล้ว npm install และ npm run dev; npm run build สร้าง dist และ npm run preview เปิด build

- src/app/main.jsx: entry point
- src/routes/index.jsx: รวม routes ที่ export จาก features
- src/layouts/AppLayout.jsx, src/components/common/FeaturePlaceholder.jsx: UI กลาง
- src/pages/: Home, System Status, Not Found
- src/lib/http.js: Axios configuration และ health response check ที่ใช้ร่วมกัน
- src/styles/index.css: global styles ผ่าน Tailwind Vite plugin
- .env.example: base URLs รวม /api/v1 ทุกตัว คัดลอกเป็น .env เพื่อปรับ URL
- vercel.json: SPA rewrite รองรับ refresh/deep link; build ผ่าน Vite preset

VITE_ ทุกตัวเปิดเผยต่อ browser ห้ามใส่ secret หรือ database credentials การเปลี่ยนค่า production ต้อง rebuild
ไม่มี route guard, login, CRUD, payment หรือ dashboard จริง; System Status เรียก health จริงและแสดง loading/online/unavailable
package.json และ package-lock.json เป็นไฟล์กลาง ต้องประสานคนที่ 5 (อั้ม) เมื่อเพิ่ม dependencies
อ่าน ../../docs/local-development.md และ ../../docs/team-ownership.md ก่อนเริ่มงาน
