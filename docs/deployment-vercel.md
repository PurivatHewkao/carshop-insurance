# Deploy บน Vercel (คู่มือเท่านั้น)

งานนี้ไม่ deploy จริง ใช้ Git repository เดียวสร้าง 6 Vercel Projects แยกกัน ไม่ใช้ multi-service experimental config

| Project           | Root Directory     | Preset/entry                        | Build/output                                  |
| ----------------- | ------------------ | ----------------------------------- | --------------------------------------------- |
| carshop-web       | apps/web           | Vite                                | npm run build / dist                          |
| carshop-identity  | services/identity  | Express / src/app.js default export | ให้ Vercel auto-detect; ไม่ต้อง build Express |
| carshop-catalog   | services/catalog   | Express / src/app.js default export | ให้ Vercel auto-detect; ไม่ต้อง build Express |
| carshop-sales     | services/sales     | Express / src/app.js default export | ให้ Vercel auto-detect; ไม่ต้อง build Express |
| carshop-payment   | services/payment   | Express / src/app.js default export | ให้ Vercel auto-detect; ไม่ต้อง build Express |
| carshop-reporting | services/reporting | Express / src/app.js default export | ให้ Vercel auto-detect; ไม่ต้อง build Express |

## ขั้นตอน

1. Push repo ที่ไม่มี secrets แล้ว Import repo 6 ครั้ง ตั้ง Root Directory ตามตาราง แต่ละส่วนติดตั้งด้วย npm install หรือ npm ci ตาม lockfile ของตัวเอง ไม่ใช้ root setup บน Vercel
2. เลือก Node.js 24.x ใน settings ให้ตรง engines ของ package; version files เป็นตัวช่วย local ไม่แทน hosting setting
3. Backend ใช้ Express preset auto-detect จาก src/app.js ซึ่ง import express และ export default app; ไม่ต้องสร้าง legacy builds/routes config หรือ api adapter; src/server.js ใช้เฉพาะ local
4. ตั้ง backend NODE_ENV=production และ CORS_ORIGINS เป็น frontend origins จริงสำหรับ Production/Preview แยกกัน ไม่ใส่ path หรือ slash ท้าย ไม่เปิด wildcard โดยไม่มีเหตุผล
5. ตั้ง database env ของแต่ละ service ที่ใช้จาก provider ภายนอก ตั้ง TLS และ network allowlist ตาม provider พร้อมจำกัด pool ให้เหมาะกับ Functions; ห้ามใช้ credentials ร่วมกัน
6. ตั้ง CATALOG_API_URL ของ Sales, SALES_API_URL ของ Payment และ SALES/PAYMENT/CATALOG_API_URL ของ Reporting ให้เป็น HTTPS backend URLs ที่รวม /api/v1 เมื่อเริ่มทำ clients
7. ตั้ง VITE_IDENTITY_API_URL, VITE_CATALOG_API_URL, VITE_SALES_API_URL, VITE_PAYMENT_API_URL, VITE_REPORTING_API_URL เป็น backend URLs รวม /api/v1 ก่อน frontend build; VITE_ เปิดเผยใน browser
8. Deploy แต่ละ project เมื่อต้องการภายหลัง แล้วตรวจ health ทุกตัว, CORS จาก frontend และ /system-status; Vercel Deployment Protection ของ preview อาจทำให้ browser เรียก health ไม่ได้ ให้ใช้วิธีที่ platform รองรับ ห้ามฝัง bypass secrets ใน VITE_
9. React Router ใช้ apps/web/vercel.json rewrite ไป index.html ทดสอบเปิด /catalog และ /system-status โดยตรงและ refresh

แต่ละ Express deployment เป็น Function ของตัวเอง ไม่เปิดหลาย ports บน Vercel ค่า PORT มีไว้ local; ห้ามสั่ง root npm run dev บน hosting
MySQL/MongoDB อยู่บริการฐานข้อมูลภายนอก Vercel; ไม่เก็บข้อมูลธุรกิจถาวรใน memory/local filesystem ของ Functions
Connections reuse ได้ใน instance เดิมแต่ไม่รับรองข้าม instances; จำกัด pools/timeouts ตาม provider ไม่มี DB connection ตอน import app/health
JWT_SECRET/INTERNAL_API_SECRET ตั้ง backend เท่านั้นเมื่อ implement จริง ห้ามสร้าง middleware ที่ทำให้เข้าใจผิดว่าป้องกันแล้ว
CORS ไม่ใช่ auth; public business APIs ต้องมี auth/validation ก่อนพร้อมใช้งานจริง

## เอกสารทางการที่ตรวจประกอบ configuration

- [Vite Getting Started](https://vite.dev/guide/) — Vite scripts และ Node requirement
- [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite) — @tailwindcss/vite และ CSS @import
- [Express on Vercel](https://vercel.com/docs/frameworks/backend/express) — zero configuration และ default export ใน src/app.js
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) — SPA deep-link rewrite
- [Node.js releases](https://nodejs.org/en/about/previous-releases) — เลือก Node 24 LTS

ตรวจเอกสารวันที่ 12 ตุลาคม 2026; ตรวจ platform settings/เอกสารอีกครั้งก่อน deploy จริง
