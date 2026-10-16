# Identity frontend — โจเซฟ

Frontend สำหรับ Auth ใช้ design tokens ของ TOYOTY เดิม (แดง/ดำ, ฟอนต์ไทย, light/dark ตามระบบ) โดย CSS อยู่ใน feature นี้ ไม่เพิ่ม dependencies และไม่แก้ service ของเพื่อน

| URL                 | การทำงาน                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `/login`            | ตรวจอีเมล/รหัสผ่าน, แสดง/ซ่อนรหัสผ่าน, loading/error, ไปหน้าโปรไฟล์หรือจัดการผู้ใช้ตาม role        |
| `/register`         | ตรวจชื่อ, อีเมล, เบอร์โทร 9–10 หลัก, password 8–128 ตัวรวมตัวอักษรอังกฤษและตัวเลข, ยืนยัน password |
| `/customer/profile` | โหลด/แก้ชื่อและเบอร์โทร, อีเมลอ่านอย่างเดียว, ออกจากระบบ                                           |
| `/admin/users`      | เฉพาะ admin ใน UI, ค้นหา/กรอง role/status, สรุปจำนวน, เปลี่ยนสิทธิ์/ระงับผู้ใช้อื่นผ่าน dialog     |

## รันและทดสอบ

ใช้ Node 24 ตาม root README: `npm run dev:web` แล้วเปิด `/login`

Development ใช้ demo ตามค่าเริ่มต้น บัญชี `customer@toyoty.demo` หรือ `admin@toyoty.demo` รหัสผ่าน `Toyoty123!`
ข้อมูล/เซสชันเก็บเฉพาะ memory และหายเมื่อ refresh ไม่มีการเก็บ password หรือ token ลง browser storage
สมัคร demo แล้วเปิดเซสชันทันที แต่ไม่ได้เก็บ password จึงใช้บัญชีที่สมัครใหม่ login ซ้ำไม่ได้ ให้ใช้บัญชีตัวอย่างที่ระบุเท่านั้น

เพิ่มใน `apps/web/.env.local` เพื่อเลือกโหมด แล้ว restart Vite:

```env
VITE_IDENTITY_MODE=api
VITE_IDENTITY_API_URL=http://localhost:3001/api/v1
```

Production build ใช้ API เป็นค่าเริ่มต้น; `VITE_IDENTITY_MODE=demo` เปิดสาธิตโดยชัดแจ้งได้
API ล้มเหลวไม่ fallback เป็นข้อมูล demo

## จุดเชื่อม backend — proposed, ยังไม่มี business endpoints จริง

`api/auth.js` เป็น adapter กลางของ feature; `api/client.js` ใช้ Axios client เดิม
ทุก success response ใช้ envelope `{ "data": ... }` และ error ใช้ `{ "error": { "code": "...", "message": "..." } }`

User: `{ id: string, name: string, email: string, phone: string, role: "customer"|"seller"|"manager"|"admin", status: "active"|"inactive" }`

| Method/path (relative `/api/v1`) | Body                          | `data`               |
| -------------------------------- | ----------------------------- | -------------------- |
| POST `auth/login`                | `{email,password}`            | `{user,accessToken}` |
| POST `auth/register`             | `{name,email,phone,password}` | `{user,accessToken}` |
| GET `users/me`                   | —                             | User                 |
| PATCH `users/me`                 | `{name,phone}`                | User                 |
| GET `users`                      | —                             | User[]               |
| PATCH `users/:id`                | `{role,status}`               | User                 |

GET users เป็นรายการทั้งหมดสำหรับ frontend filtering ในเวอร์ชันนี้ หาก backend ใช้ pagination ให้ปรับ adapter และ UI ร่วมกันก่อน integrate
ทุก endpoint นอกจาก login/register ส่ง `Authorization: Bearer <accessToken>`; token อยู่ memory และ refresh ต้อง login ใหม่ ไม่มี refresh token flow
Logout ล้างเซสชันฝั่ง frontend; ยังไม่มี revoke endpoint
401 แสดงให้ login ใหม่, 403 ไม่มีสิทธิ์, 409 อีเมลซ้ำ, network/5xx แสดงข้อผิดพลาดและปุ่ม retry ในหน้ารายการ
UI guard เฉพาะหน้าใน feature นี้ ไม่ได้เพิ่ม guard ให้ routes ของทีม; backend ต้อง validate payload, hash password, verify JWT, ตรวจ role/status และป้องกันแก้สิทธิ์ตนเอง/ลบ admin คนสุดท้ายจริง
Register ส่งได้เฉพาะข้อมูลลูกค้า ไม่มี role จากฟอร์ม; backend ต้องกำหนด role customer เอง

ไฟล์หน้าจออยู่ใน `pages/`, shared UI ใน `components/AuthUI.jsx`, loader พร้อม abort ใน `hooks/useAuthData.js`, CSS ใน `styles/auth.css`
รัน `npm run build`, `npm run lint`, `node apps/web/src/features/identity/check-auth.mjs` (Node 24)
