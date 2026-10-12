# พัฒนาในเครื่อง

## เริ่มต้น

1. ติดตั้ง Node.js 24 LTS และ npm ตรวจ node --version ให้เป็น 24.x ใช้ .nvmrc หรือ .node-version ตาม version manager
2. เปิด terminal ที่ root และรัน npm run setup เพื่อติดตั้ง root, frontend และทั้ง 5 services
3. ไม่ต้องมี .env เพื่อทดลอง scaffold; defaults ใช้ localhost ตาม ports ด้านล่าง ถ้าปรับค่าให้คัดลอก .env.example ของแต่ละ directory เป็น .env ด้วย editor
4. npm run dev เปิดทั้ง 6 ส่วน; เปิด http://localhost:5173 และหน้า /system-status
5. หยุดด้วย Ctrl+C; ไม่ต้องใส่ database credentials เพื่อเรียก health

| ส่วน      | Port | Root command          |
| --------- | ---- | --------------------- |
| web       | 5173 | npm run dev:web       |
| identity  | 3001 | npm run dev:identity  |
| catalog   | 3002 | npm run dev:catalog   |
| sales     | 3003 | npm run dev:sales     |
| payment   | 3004 | npm run dev:payment   |
| reporting | 3005 | npm run dev:reporting |

npm run build สร้าง apps/web/dist; npm run lint ตรวจทั้งหมด; npm run smoke เปิดแต่ละ backend ชั่วคราวเพื่อตรวจ health/404/CORS/errors โดยตัด database env ออกแล้วปิด listeners
npm run format:check ตรวจรูปแบบ; npm run format จัดรูปแบบ
root scripts เป็น Node + concurrently ไม่มี syntax เฉพาะ shell

## ติดตั้งแยก

Frontend: cd apps/web → npm install → npm run dev; npm run build; npm run preview
Backend: cd services/identity (หรือชื่อ service) → npm install → npm run dev หรือ npm start
แต่ละส่วนมี lockfile ของตัวเอง npm ci ใช้เมื่อต้องการติดตั้งตาม lockfile; root npm run setup ใช้ npm install เพื่อเริ่มต้นและอัปเดต lockfile ตาม package
ไม่ต้องติดตั้ง root เพื่อรัน service/frontend เดี่ยว แต่ root tooling จำเป็นสำหรับ lint/format รวม

## Environment

Frontend `VITE_*_API_URL` รวม /api/v1 ทุกตัว เช่น http://localhost:3002/api/v1; client เรียก health แบบ relative
`VITE_` ถูกฝังใน build และเปิดเผยต่อ browser ห้าม secrets/DB credentials; restart dev/rebuild หลังเปลี่ยน
CORS_ORIGINS คั่นด้วย comma ไม่มี path/trailing slash เช่น http://localhost:5173,http://127.0.0.1:5173
`MYSQL_*` เฉพาะ Identity/Catalog/Sales/Payment; MONGODB_URI เฉพาะ Catalog/Reporting; เริ่ม connection เมื่อเรียก function เท่านั้น
ตั้งฐานข้อมูลภายนอกและ TLS ตาม provider เมื่อทำ business feature ไม่ใช้ credentials ของคนอื่น
JWT_SECRET/INTERNAL_API_SECRET จะเพิ่มเมื่อพัฒนา auth/internal APIs จริง

## แก้ปัญหา

- EADDRINUSE: ปิด process ที่ใช้ port หรือปรับ PORT และ VITE_* พร้อมกัน; Vite strictPort ไม่เปลี่ยน port เงียบ ๆ
- unavailable: ตรวจว่า service รันอยู่ เปิด URL /api/v1/health, ตรวจ base URL, Network และ CORS; service อื่นไม่ควรถูกปิดเพราะตัวหนึ่งล้ม
- health online แต่ DB error: เป็นเรื่องปกติของ liveness ตรวจ config/TLS/provider เมื่อเริ่มใช้ repository
- 404: ยังไม่มี business endpoints ตรวจ path และ docs/api-contracts.md
- Vercel refresh 404: ตรวจ Root Directory และ apps/web/vercel.json
- engine mismatch: ใช้ Node 24 LTS แทน Node เก่าที่เครื่องมี; ไม่แก้ engines ให้ต่ำลงเพื่อซ่อนปัญหา
- ห้ามส่ง .env หรือ URL ฐานข้อมูลที่มีรหัสผ่านใน PR/log/screenshot
