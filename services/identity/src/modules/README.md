# Business modules — คนที่ 1 (โจเซฟ)

ยังไม่ได้พัฒนา business API; health/routes.js เป็น route เดียวที่ทำงานจริง
เพิ่มโฟลเดอร์ module ตามขอบเขตใน README ของ service เช่น routes.js → controller.js → service.js → repository.js และ validation.js เมื่อมีการใช้งานจริง
ติดตั้ง validation library เมื่อเริ่มใช้ และเพิ่ม OpenAPI contract ใน docs/api-contracts.md ก่อนเชื่อมกับทีม
เพิ่ม JWT และ bcrypt เมื่อทำ auth; ยังไม่มี hashing/token/permission middleware ใน scaffold
