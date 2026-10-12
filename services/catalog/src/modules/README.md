# Business modules — คนที่ 2 (กร)

ยังไม่ได้พัฒนา business API; health/routes.js เป็น route เดียวที่ทำงานจริง
เพิ่มโฟลเดอร์ module ตามขอบเขตใน README ของ service เช่น routes.js → controller.js → service.js → repository.js และ validation.js เมื่อมีการใช้งานจริง
ติดตั้ง validation library เมื่อเริ่มใช้ และเพิ่ม OpenAPI contract ใน docs/api-contracts.md ก่อนเชื่อมกับทีม
เพิ่ม auth/role checks เมื่อ Identity contract พร้อม ไม่มี middleware ที่แสร้งว่าตรวจสิทธิ์แล้ว
