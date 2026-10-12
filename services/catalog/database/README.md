# ฐานข้อมูลของ catalog

เจ้าของ: คนที่ 2 (กร)
MySQL: carshop_catalog; เพิ่ม migrations/*.sql และคู่มือ migration/rollback เมื่อเริ่มออกแบบ schema ยังไม่มี migrations ใน scaffold
MongoDB: carshop_catalog_documents; สร้าง Mongoose models ใน src/modules/<module>/models/ เมื่อเริ่มพัฒนา พร้อม index และ migration strategy

ห้าม FK ข้าม service หรือข้าม MySQL/MongoDB; อ้างอิง ID ผ่าน API ตาม docs/database-ownership.md
ไม่รัน migration อัตโนมัติเมื่อ import app และไม่ใช้ credentials ร่วมกับ service อื่น
ราคา สต็อก สถานะขาย และโปรโมชั่นอยู่ MySQL; MongoDB เก็บรายละเอียดเทคนิคเท่านั้น
