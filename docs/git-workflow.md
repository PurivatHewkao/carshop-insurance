# Git workflow

โฟลเดอร์เริ่มต้นไม่มี Git repository; ให้ทีมสร้าง remote และรัน git init เมื่อตกลงเจ้าของ repo แล้ว scaffold นี้ไม่ commit/push ให้

Branches ตัวอย่าง: feature/identity-auth, feature/catalog-search, feature/sales-orders, feature/payment-simulation, chore/integration-layout

1. git switch main และ git pull --ff-only เมื่อเชื่อม remote แล้ว
2. git switch -c feature/sales-orders (เลือกชื่อตามงาน)
3. แก้เฉพาะ feature/service ของตัวเอง หากแตะไฟล์กลางแจ้งคนที่ 5 (อั้ม) และผู้เกี่ยวข้องก่อน
4. npm run lint, npm run build และ smoke หรือ business checks ที่เหมาะสม
5. git status และ git diff ตรวจสิ่งที่จะ commit ห้าม secrets/.env/node_modules/dist
6. git add ตาม paths งาน, git commit -m "feat(sales): add order status flow" และ git push -u origin feature/sales-orders
7. เปิด PR ระบุพฤติกรรม, contract/env changes และผลตรวจ ส่ง review ให้เจ้าของที่เกี่ยวข้องและคนที่ 5 (อั้ม) เมื่อแตะ integration

ทุกคนเสนอแก้ไฟล์กลางได้ผ่าน PR ไม่ให้คนที่ 5 (อั้ม) ทำแทน; ถ้า contract เปลี่ยนประสานผู้เรียก API ก่อน merge
package-lock.json อยู่ root และแต่ละ app/service เจ้าของ service ดูแลของตัวเอง Frontend lockfile ประสานร่วมกัน
ห้าม commit secrets และห้ามใส่ secret ใน VITE_ ถ้ารั่วต้อง revoke/rotate ไม่ใช่แค่ลบไฟล์
.github/CODEOWNERS บันทึกชื่อเล่นและ ownership เป็น comments ต้องเติม GitHub handles จริงและเปิดใช้งาน rules ก่อนเปิด required review
