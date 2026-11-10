# Business modules — คนที่ 1 (โจเซฟ)

มี health/routes.js และ auth/routes.js ที่ทำงานจริง: Register/Login/Logout และ users/me ด้วย JWT ดู ../README.md ของ service สำหรับวิธีใช้งานและข้อจำกัด memory storage
เพิ่มโฟลเดอร์ module ตามขอบเขตใน README ของ service เช่น routes.js → controller.js → service.js → repository.js และ validation.js เมื่อมีการใช้งานจริง
ติดตั้ง validation library เมื่อเริ่มใช้ และเพิ่ม OpenAPI contract ใน docs/api-contracts.md ก่อนเชื่อมกับทีม
auth/service.js ใช้ scrypt hash passwords และ jsonwebtoken; authenticate middleware ตรวจ JWT และค้นผู้ใช้จาก auth/repository.js ซึ่งเป็น Map ชั่วคราว ยังไม่เชื่อม database
