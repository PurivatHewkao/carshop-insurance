# สถาปัตยกรรม

Git monorepo เดียว ไม่มี npm workspaces เพื่อให้ npm install จาก directory ของแต่ละ app ทำงานโดยอิสระ React + Vite แอปเดียวและ Express ES Modules 5 services REST/JSON

Browser → Identity / Catalog / Sales / Payment / Reporting ผ่าน Axios ตาม feature
Sales → Catalog; Payment → Sales; Reporting → Sales/Payment/Catalog ผ่าน HTTP เท่านั้น ยังไม่มี business clients ทำงานใน scaffold

| Service   | เจ้าของ    | ข้อมูลหลัก                                                   | ฐานข้อมูล                         |
| --------- | ---------- | ------------------------------------------------------------ | --------------------------------- |
| identity  | 1 (โจเซฟ)  | users, password hashes, roles, permissions                   | MySQL carshop_identity            |
| catalog   | 2 (กร)     | รถ รุ่น ราคา stock สถานะ โปรโมชั่น                           | MySQL carshop_catalog             |
| catalog   | 2 (กร)     | รายละเอียดเทคนิครถ                                           | MongoDB carshop_catalog_documents |
| sales     | 3 (เฟียร์) | orders/items, appointments, assignments, requests, approvals | MySQL carshop_sales               |
| payment   | 4 (ดิว)    | payments, invoices, refunds จำลอง                            | MySQL carshop_payment             |
| reporting | 5 (อั้ม)   | activity logs และรายงานที่ดึงผ่าน APIs                       | MongoDB carshop_reporting         |


แต่ละ service มี package/lockfile/config ของตัวเอง ห้าม import business logic หรือใช้ database ของกันและกัน

MySQL server เดียวหลาย databases ได้ แต่ credentials แยกกัน ราคา stock ยอดชำระ และสถานะธุรกรรมใช้ MySQL เป็นแหล่งข้อมูลหลัก
Cross-service operations ต้องตกลง idempotency, retry, stock reservation, failure recovery กับเจ้าของ ไม่มี distributed transaction ข้าม DB ใน scaffold

Health เป็น liveness ไม่ใช้ DB; database connections เป็น lazy functions ไม่มี side effects ตอน import app; app.js export app และ server.js เปิด port เฉพาะ local
Vercel 6 projects แยกกัน ฐานข้อมูลอยู่บริการภายนอก อ่าน deployment-vercel.md
