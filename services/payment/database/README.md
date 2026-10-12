# ฐานข้อมูลของ payment

เจ้าของ: คนที่ 4 (ดิว)
MySQL: carshop_payment; เพิ่ม migrations/*.sql และคู่มือ migration/rollback เมื่อเริ่มออกแบบ schema ยังไม่มี migrations ใน scaffold

ห้าม FK ข้าม service หรือข้าม MySQL/MongoDB; อ้างอิง ID ผ่าน API ตาม docs/database-ownership.md
ไม่รัน migration อัตโนมัติเมื่อ import app และไม่ใช้ credentials ร่วมกับ service อื่น
