# Identity database

ใช้ฐานข้อมูลกลาง carshop_sql และ schema ที่ db schema/01_mysql_schema.sql ดูวิธี migration/seed/test ใน ../README.md

Identity อ่านและเขียน users, customers, employees สำหรับบัญชี/โปรไฟล์ และเพิ่ม identity_revoked_tokens กับ identity_admin_lock

Migration เป็น additive และ idempotent ต้องมีตารางจาก schema กลางก่อน ใช้ npm run migrate จาก services/identity สำรองฐานข้อมูลก่อนเปลี่ยน schema จริง

ไม่ลบตาราง support ระหว่างมี token ที่ยังใช้งานได้ การ rollback application ต้องพิจารณารายการ token ที่ยกเลิกแล้วด้วย
