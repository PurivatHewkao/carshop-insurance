# ฐานข้อมูลของ reporting

เจ้าของ: คนที่ 5 (อั้ม)
MongoDB: carshop_reporting; สร้าง Mongoose models ใน src/modules/<module>/models/ เมื่อเริ่มพัฒนา พร้อม index และ migration strategy

ห้าม FK ข้าม service หรือข้าม MySQL/MongoDB; อ้างอิง ID ผ่าน API ตาม docs/database-ownership.md
ไม่รัน migration อัตโนมัติเมื่อ import app และไม่ใช้ credentials ร่วมกับ service อื่น
