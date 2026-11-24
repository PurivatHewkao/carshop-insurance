# NOVA: ขอราคาตามรถและสเปก

## localhost ใช้ข้อมูลเดียวกับเว็บจริง

ตั้ง `NOVA_UPSTREAM_API_URL=https://nova-insure-api-production.up.railway.app/api` ใน `insurance/backend/.env` แล้ว restart backend
เบราว์เซอร์ยังเรียก localhost:3010 ตามเดิม แต่ login/session/รายการแอดมิน/กรมธรรม์อ่านและทำรายการผ่าน API จริงของ Railway ไม่ต้องเผยแพร่พอร์ต MySQL หรือคัดลอกรหัสฐานข้อมูล
หน้าขอราคาใหม่คำนวณใน backend local โดยอ่านแผนที่เปิดขายจาก API จริง ไม่มี fallback ไปฐานข้อมูล local หาก Railway ใช้ไม่ได้
หน้าผู้ดูแลแสดงแหล่งข้อมูล และการอนุมัติจะมีผลในระบบจริง โหมดนี้ปิด worker sync ในเครื่องและใช้ไม่ได้เมื่อ NODE_ENV=production
เอาตัวแปรนี้ออกเพื่อกลับไปใช้ MySQL ตาม DATABASE_URL/MYSQL* ในเครื่อง ไม่มีการ migrate, seed, สร้างแอดมิน หรือเปลี่ยนข้อมูล production ระหว่างตั้งค่าการเชื่อมต่อ

หน้าแรก NOVA เป็นแบบฟอร์ม 4 ขั้น: เลือกรถ → รุ่นย่อย/สี/ล้อ → เปรียบเทียบแผน → สรุปราคาและดาวน์โหลดข้อความให้ Seller
ซื้อพร้อมรถผ่าน Seller ตามเดิม ไม่ได้เปิดการซื้อหรือจ่ายเงินจากหน้า NOVA โดยตรง

## ตารางรับประกันจำลอง

`packages/insurance/rating.js` คือกติกาที่มีเวอร์ชัน แยกจากราคาขาย Catalog
อ้างอิงตัวเลือกรุ่นย่อย สี และล้อจาก Catalog production วันที่ 2026-11-24: E-san, Khon, Iburaporn, RushRi
ไม่รวม Aufa ตามคำขอผู้ใช้ ทุกอัตราเป็นสมมติฐานเพื่อการศึกษา ไม่ใช่อัตราที่ปรับเทียบด้วยข้อมูลเคลม
ตารางตัวเลือกหน้า NOVA เป็น snapshot มีเวอร์ชัน ไม่ได้ sync กับ Catalog อัตโนมัติ เมื่อราคา/ตัวเลือกเปลี่ยน ต้องปรับตารางรับประกันและเวอร์ชันด้วย

ทุน = floor((ราคารุ่นย่อย + ค่าสีเพิ่ม + ค่าล้อเพิ่ม) × 80% / 10,000) × 10,000

- ชั้น 1: (5,000 + ทุน × 2%) × กลุ่มรถ × รุ่นย่อย
- ชั้น 2+: (4,000 + ทุน × 0.6%) × กลุ่มรถ × รุ่นย่อย วงเงินชน 200,000 แยกจากทุนสูญหาย/ไฟไหม้
- กลุ่มรถ: E-san 1.00, Khon/Iburaporn 1.10, RushRi 1.15
- รุ่นย่อย: Eco/Balanced 1.00, High Performance 1.15
- ชั้น 3+: ฐาน E-san 6,900, SUV 7,900, RushRi 8,900 คูณรุ่นย่อย
- ชั้น 3: E-san 3,490, SUV 3,990, RushRi 4,490 ไม่เพิ่มตามออปชัน
- ปัดเบี้ยชั้น 1/2+/3+ เป็นหลักร้อย แล้วส่วนลด source=toyoty 5% ไม่เกิน 1,000 บาท
- ยอดเป็นยอดรวมเดโม ไม่รวม พ.ร.บ. ไม่มีการแยกคำนวณ VAT/อากรในเวอร์ชันนี้ ซ่อมอู่ ส่วนแรกสมัครใจ 0
- รับเฉพาะรถในรายการ ปีผลิต 2025–2027 ใช้ส่วนบุคคล ไม่มีการประเมินอายุรถรายปี ประวัติผู้ขับขี่ หรือการใช้เชิงพาณิชย์

## API และความถูกต้องของราคา

- `GET /api/quotes/catalog`: ตารางรับประกันที่มีเวอร์ชัน
- `POST /api/quotes`: รับ modelSlug, trimCode, colorCode, wheelCode, source ไม่รับราคาจาก browser โหลดแผนที่ active จาก MySQL
- `POST /api/partner/quotes`: partner key เดิม รับข้อมูลรถที่ Sales อ่านจาก DB คืนแผนที่ลงลายเซ็นและผูก carId/VIN/ปี/รุ่นย่อย/มูลค่ารถ
- Sales `GET /api/v1/insurance/plans?carId=<uuid>`: Seller อ่านราคาสำหรับรถที่เลือก ซ่อน quoteToken จาก browser
- ก่อนขาย Sales อ่านรถจาก DB ขอราคาใหม่ ตรวจ expectedPremium และตรวจข้อมูลรถซ้ำใน transaction ที่ล็อกรถแล้ว
- ตอนส่งคำขอหลังชำระเงิน NOVA ตรวจ VIN/ปี/ชื่อรุ่นเทียบ signed quote; คำขอเก่าที่ไม่มี ratingVersion ยังอ่านและส่งซ้ำได้ตามเดิม
- ราคาของรถจริงฝั่ง Seller ใช้ `cars.price` ซึ่งรวมออปชันแล้ว ไม่บวกสี/ล้อซ้ำ; รุ่นย่อยอ่านจาก car_trims ถ้ามี หาก schema เดิมไม่มี trim ให้ใช้ ECO

## ตรวจสอบ

```
node --test insurance/backend/test/core.test.js services/sales/test/*.test.js
npm --prefix insurance/frontend run build
npm --prefix apps/web run build
```

ทดสอบ HTTP ใช้ fixture pool เฉพาะชุดทดสอบ ไม่เปลี่ยน runtime เป็นฐานข้อมูลจำลอง การทดสอบซื้อรถจริงต้องมี MySQL และการตั้งค่า NOVA ทั้งสอง service
การเปลี่ยนแปลงนี้ไม่ migrate ฐานข้อมูลและไม่ deploy อัตโนมัติ ต้องเผยแพร่ NOVA backend/frontend และ Sales/web พร้อมกันเพราะสัญญา API ราคาประกันเปลี่ยนเป็นรายรถ
