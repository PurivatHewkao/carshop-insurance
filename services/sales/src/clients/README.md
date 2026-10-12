# HTTP clients ที่วางแผนไว้

- sales → catalog: เพิ่ม catalog.js เมื่อ contract พร้อม ใช้ CATALOG_API_URL ซึ่งรวม /api/v1

ใช้ fetch ของ Node.js พร้อม timeout, ตรวจ HTTP status, validation, authentication และ error mapping ตาม contract ห้าม query database หรือ import logic ของอีก service
ยังไม่มีการเรียก business API ปลายทางที่ไม่ได้พัฒนา เพิ่ม INTERNAL_API_SECRET ใน backend เมื่อทีมตกลง internal authentication เท่านั้น
