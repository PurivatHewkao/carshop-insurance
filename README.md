# Carshop — โครงโปรเจกต์ทีม 5 คน

Scaffold สำหรับบริษัทขายรถยนต์ React แอปเดียว + Express 5 microservices ใน monorepo ไม่มี business features สำเร็จปลอม ไม่มี auth/CRUD/orders/payments จริง และยังไม่ deploy

## เริ่มใช้

ใช้ **Node.js 24 LTS (24.x)** + npm มี .nvmrc/.node-version และ engines ในทุก package

```sh
npm run setup
npm run dev
```

เปิด http://localhost:5173 และ /system-status โดยไม่ต้องมี database credentials
setup ติดตั้ง root และทั้ง 6 apps โดยไม่ใช้ npm workspaces; แต่ละ directory มี package และ lockfile ติดตั้ง npm install รันแยกได้

## โครงสร้าง

- apps/web/: React + Vite, Tailwind Vite plugin, React Router, Axios; features แยกตามเจ้าของ
- services/identity/: คนที่ 1 (โจเซฟ) / MySQL / port 3001
- services/catalog/: คนที่ 2 (กร) / MySQL + MongoDB / port 3002
- services/sales/: คนที่ 3 (เฟียร์) / MySQL / port 3003
- services/payment/: คนที่ 4 (ดิว) / MySQL / port 3004
- services/reporting/: คนที่ 5 (อั้ม) / MongoDB / port 3005
- docs/: คู่มือแบ่งงาน สถาปัตยกรรม contracts ฐานข้อมูล local deployment Git
- scripts/: setup และ smoke checks ข้ามระบบ

ส่วนที่ใช้ได้จริง: Home, feature placeholders 5 หน้า, System Status loading/online/unavailable, GET /api/v1/health ทุก service, CORS/helmet/404/error handler และ lazy DB configs
Health ไม่ใช้ฐานข้อมูล ไม่ยืนยันว่า business APIs พร้อม

## คำสั่ง

- npm run dev:web / dev:identity / dev:catalog / dev:sales / dev:payment / dev:reporting
- npm run build: build frontend
- npm run lint: ตรวจทั้ง monorepo
- npm run smoke: runtime smoke ของ 5 apps ไม่มี DB credentials
- npm run format:check / format: รูปแบบไฟล์

## คู่มือทีม

เริ่มที่ **[docs/team-ownership.md](docs/team-ownership.md)** มี ownership จริง งานเริ่มต้น ไฟล์กลาง และเกณฑ์ส่ง integrate ของแต่ละคน
อ่าน [local development](docs/local-development.md), [architecture](docs/architecture.md), [contracts](docs/api-contracts.md), [database ownership](docs/database-ownership.md), [Vercel deployment](docs/deployment-vercel.md), [Git workflow](docs/git-workflow.md) และ [ผลตรวจ](docs/verification.md)

คนที่ 5 (อั้ม) ดูแลการประสาน integration/tooling/UI กลาง เจ้าของแต่ละ service ต้องเชื่อมและแก้ปัญหาของตัวเอง
VITE_ เปิดเผยต่อ browser ห้ามใส่ secrets; ทุก API base URL รวม /api/v1; .env.example มี placeholders เท่านั้น
ไม่มีประกัน/warranty, TypeScript, Docker, Kubernetes หรือ broker ในงานนี้
