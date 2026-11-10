# Identity / MySQL

Register, Login, Logout, Profile และ Admin ใช้ฐานข้อมูลกลาง carshop_sql ตาม db schema/01_mysql_schema.sql

## เริ่มใช้งาน

ใช้ Node.js 24 ตามโครงการ คัดลอก .env.example เป็น .env และใส่ค่าจริง จาก root รัน

    npm --prefix services/identity run migrate
    npm --prefix services/identity run seed:admin
    npm run dev:identity
    npm run dev:web

เครื่องนี้ทดสอบด้วย Node 22.20.0 ที่ติดตั้งอยู่ หาก shell ยังเป็น Node 20 ให้เลือก Node 24 หรือ Node 22.20 ขึ้นไปก่อนรัน Vite

Migration ต้องมี users/customers/employees จาก schema กลางก่อน เพิ่มเฉพาะ identity_revoked_tokens และ identity_admin_lock รันซ้ำได้ ไม่มี DROP ตารางเดิม Migration ไม่รันอัตโนมัติตอนเปิด API

Seed อ่าน ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD จาก .env ใช้สำหรับ Admin คนแรก รันซ้ำด้วย email เดิมจะไม่เปลี่ยนรหัสผ่าน หากมี Admin แล้วให้สร้างเพิ่มผ่าน /admin/users

## API

Base /api/v1 ใช้ success envelope {data: ...} และ error {error:{code,message}}

| Method | Path           | สิทธิ์ / ข้อมูล                                           |
| ------ | -------------- | --------------------------------------------------------- |
| POST   | /auth/register | public; name,email,phone,password; 201 user + accessToken |
| POST   | /auth/login    | public; email,password; 200 user + accessToken            |
| POST   | /auth/logout   | Bearer JWT; 204 ยกเลิก token ใบปัจจุบัน                   |
| GET    | /users/me      | Bearer JWT; โปรไฟล์                                       |
| PATCH  | /users/me      | Bearer JWT; name,phone                                    |
| GET    | /users         | Admin; รายการผู้ใช้                                       |
| POST   | /users         | Admin; name,email,phone,password,role,status; 201 user    |
| PATCH  | /users/:id     | Admin; role,status                                        |

Roles API เป็นตัวพิมพ์เล็ก customer/seller/manager/admin/finance/stock แปลงเป็นตัวพิมพ์ใหญ่ใน MySQL สมัครสาธารณะเป็น customer เสมอ

รหัสผ่านใช้ scrypt พร้อม random salt ใน password_hash รูปแบบ scrypt$salt$hash JWT HS256 อายุ 1 ชั่วโมง ใช้ JWT_SECRET คงที่ใน .env ทุก protected request ตรวจบัญชีและสถานะล่าสุดจาก MySQL และรายการ revoked tokens การเปลี่ยน role มีผลต่อ API ครั้งถัดไป

Admin เปลี่ยนสิทธิ์ตัวเองไม่ได้ งานจัดการสิทธิ์ใช้ transaction และแถว lock ร่วมเพื่อป้องกันการแก้พร้อมกันจนไม่มี Admin เหลือ เก็บ customers/employees IDs เดิมเมื่อเปลี่ยน role เพื่อรักษา foreign keys

Register สร้าง customers ส่วนพนักงานสร้าง employees ใน transaction เดียวกับ users ช่องชื่อเต็มของ UI เก็บใน first_name และ last_name ว่าง ชื่อจากข้อมูลเดิมอ่านโดยรวม first_name/last_name ส่วน username ของบัญชีใหม่เป็น UUID เพราะ Login ใช้ email

ฐานข้อมูลจริงที่ตรวจครั้งนี้ไม่มีบัญชีเดิม ระบบรองรับ hash แบบ scrypt ที่สร้างโดย Identity นี้ หากนำบัญชีจากระบบอื่นเข้ามา ต้องเพิ่มการย้ายรูปแบบ password hash ตามระบบต้นทางก่อน

JWT ฝั่ง Browser เก็บใน memory รีเฟรชต้อง Login ใหม่ บัญชีและ revoked tokens คงอยู่หลังรีสตาร์ต Backend การ Logout ตอน API ติดต่อไม่ได้ล้าง local token แต่ token ฝั่ง server ยังมีอายุจนหมดเวลา

## Test

    npm --prefix services/identity test

ต้องมี MySQL ที่ credentials ใน .env สร้าง/ลบฐานข้อมูลทดสอบได้ Runner สุ่มชื่อ carshop_identity_<random>_test สร้าง schema แยก รัน migration ซ้ำ ทดสอบ Backend, frontend adapter และ headless Edge จากนั้นลบเฉพาะฐานข้อมูลที่สร้างเอง ไม่รับชื่อฐานข้อมูลที่จะลบจาก environment

Browser test ใช้ Microsoft Edge ค่าเริ่มต้น ตั้ง PLAYWRIGHT_CHANNEL=chrome หากใช้ Chrome มีการตรวจ Register/Profile/Login/Logout, route guards และ Admin สร้างผู้ใช้/เปลี่ยน role/ระงับบัญชี

Admin test ตรวจ seed ซ้ำ อีเมลซ้ำ สิทธิ์ล่าสุด การแก้พร้อมกัน และข้อมูลหลังปิด/เปิด connection ใหม่ Auth test ตรวจ JWT ปลอม/หมดอายุ/issuer/audience ผิด Logout, validation และ rate limit

Login/Register รวม 30 requests/IP/15 นาที รายการผู้ใช้เป็นรายการทั้งหมดสำหรับงานขนาดเล็ก UI กรองข้อมูลใน Browser
