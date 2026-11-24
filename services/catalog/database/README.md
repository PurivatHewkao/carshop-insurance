# ฐานข้อมูลของ catalog

เจ้าของ: คนที่ 2 (กร)
MySQL: carshop_catalog; เพิ่ม migrations/*.sql และคู่มือ migration/rollback เมื่อเริ่มออกแบบ schema ยังไม่มี migrations ใน scaffold
MongoDB: carshop_catalog_documents; สร้าง Mongoose models ใน src/modules/<module>/models/ เมื่อเริ่มพัฒนา พร้อม index และ migration strategy

ห้าม FK ข้าม service หรือข้าม MySQL/MongoDB; อ้างอิง ID ผ่าน API ตาม docs/database-ownership.md
ไม่รัน migration อัตโนมัติเมื่อ import app และไม่ใช้ credentials ร่วมกับ service อื่น
ราคา สต็อก สถานะขาย และโปรโมชั่นอยู่ MySQL; MongoDB เก็บรายละเอียดเทคนิคเท่านั้น

## TOYOTY configurator (07 + 08)

ลำดับรัน (ฐานเดิมที่มีข้อมูลแล้ว): `03_catalog_columns.sql` → `07_toyoty_configurator.sql` → `08_seed_toyoty.sql`
ฐานใหม่: `01/02` schema → `04_seed_catalog.sql` (ถ้าอยากมีรถเดิมไว้ดูย้อนหลัง) → `07` → `08`
ทั้งสองไฟล์รันซ้ำได้ ไม่ลบอะไร; Railway ต้อง export backup ก่อนและให้โจเซฟรันรอบเดียวตามที่ตกลง
Railway (schema `railway`): ใช้ `railway_toyoty_run_once.sql` = 07 + 08 ในไฟล์เดียว ไม่มี DELIMITER รันได้ทุก client แต่รันได้ครั้งเดียว

- 07 เพิ่มตาราง `car_trims`, `paint_colors`, `wheel_options`, `trim_colors`, `trim_wheels`, `production_slots`, `legacy_hidden_cars`
  เพิ่มคอลัมน์ `car_models.is_active`, `car_models.weekly_capacity` และใน `cars`: `trim_id`, `paint_color_id`, `wheel_id`, `price_breakdown`,
  `production_status`, `build_week`, `eta_from`, `eta_to`, `first_eta_to`, `ready_date`
- รอบแรกเท่านั้น: ซ่อนทุกรุ่นที่ไม่ใช่ TOYOTY (`is_active = 0`) และตั้งรถ AVAILABLE ของรุ่นเหล่านั้นเป็น INACTIVE โดยจดสถานะเดิมไว้ใน `legacy_hidden_cars`
  order / ใบแจ้งหนี้ / กรมธรรม์เดิมยังเปิดดูได้ เพราะไม่ได้ลบแถวใด
- 08 ใส่ 4 รุ่น (E-san, Khon, RushRi, Iburaporn) × 3 รุ่นย่อย, สี 6, ล้อ 4, รถโชว์รุ่นละ 1 คัน (VIN `TYTOSHOWROOM0000x`) แถวที่มีอยู่แล้วไม่ถูกเขียนทับ

`cars.production_status` เป็น NULL = รถสต็อก/รถโชว์ปกติ; มีค่า = รถสั่งผลิต ซึ่งหน้าสต็อกเดิม (`PATCH /cars/:id/stock`) จะไม่นับและไม่แตะ

### ย้อนกลับไปใช้แคตตาล็อกเดิม

```sql
UPDATE cars c JOIN legacy_hidden_cars h ON h.car_id = c.id
  SET c.status = h.previous_status WHERE c.status = 'INACTIVE';
UPDATE car_models SET is_active = 1 WHERE brand <> 'TOYOTY';
UPDATE car_models SET is_active = 0 WHERE brand = 'TOYOTY';  -- ถ้าต้องการซ่อนรุ่นใหม่ด้วย
```
ตารางและคอลัมน์ใหม่เก็บไว้ได้ ไม่กระทบโค้ดเดิม
