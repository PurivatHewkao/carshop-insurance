# Clients ของ service อื่น

- `orders.js` — **ชั่วคราว**: อ่าน/แก้ `orders` (Sales/เฟียร์) และ `cars` (Catalog/กร) ตรงใน `carshop_sql`
  เพราะ Sales ยังไม่มี order API. เมื่อมี API แล้วให้เปลี่ยนไฟล์นี้ไปเรียก `SALES_API_URL` ด้วย fetch
  (timeout, ตรวจ status, map error) โดยไม่ต้องแก้ module อื่น
