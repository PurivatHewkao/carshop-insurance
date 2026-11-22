# Business modules — คนที่ 3 (เฟียร์)

Business API มี lookups, appointments, assignments และ orders ใน modules ของตนเอง พร้อม validation และ repository ที่ใช้ MySQL
ทุก business route ถูกครอบด้วย `packages/auth` เพื่อยืนยัน Identity session; แต่ละ route ตรวจ role และ actor ownership ฝั่ง server
เพิ่ม modules และ validation ตามความจำเป็น และประสานการเปลี่ยน API contract กับ service ที่เรียก Sales
