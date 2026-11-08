-- Seed data for the catalog (demo values from the old frontend catalogData.js).
-- Run AFTER 01_mysql_schema.sql and 03_catalog_columns.sql.
-- Safe to re-run: ids are fixed UUIDs. Rows that already exist (for example from the
-- earlier 03_seed_catalog.sql) only get their EMPTY new columns filled in; values you have
-- edited are kept. This file replaces the earlier 03_seed_catalog.sql.
--
-- Stock of a model = number of its cars with status 'AVAILABLE'. A model with stock 0 gets one
-- INACTIVE car row so its price is still stored. VINs starting with 'DEMO' are placeholders.
SET NAMES utf8mb4;
USE carshop_sql;

-- car_models
INSERT INTO car_models (id, slug, brand, model_name, body_type, description, tag, featured, variant, engine, horsepower, transmission, drive, fuel, seats, location, warranty, features, color_options) VALUES
  ('4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'yaris-ativ', 'Toyota', 'Yaris Ativ', 'sedan', 'ซีดานขนาดกะทัดรัดสำหรับใช้งานในเมือง คล่องตัว ประหยัดพื้นที่จอด และมีอุปกรณ์อำนวยความสะดวกสำหรับการเดินทางทุกวัน', 'ยอดนิยม', 1, 'Premium Luxury', '1.2 ลิตร เบนซิน', 94, 'อัตโนมัติ CVT', 'ขับเคลื่อนล้อหน้า', 'เบนซิน', 5, 'โชว์รูมกรุงเทพฯ', 'รับประกันตามเงื่อนไขผู้ผลิต', '["ระบบความปลอดภัยพื้นฐาน","จอสัมผัสเชื่อมต่อสมาร์ตโฟน","กล้องมองหลัง","ห้องโดยสาร 5 ที่นั่ง"]', '[{"name":"เทาเข้ม","value":"#414852","images":["https://toyotavorachakyont.com/image/model/YARIS%20ATIV/line-up/HEV%20Premium_HEV_Premium_Urban_Metal.webp"]},{"name":"ดำ","value":"#202126","images":["https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/2025_Toyota_Yaris_ATIV_HEV_Premium_%282%29.jpg/1280px-2025_Toyota_Yaris_ATIV_HEV_Premium_%282%29.jpg"]},{"name":"เทาเงิน","value":"#A7ADB5"},{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"แดง","value":"#C8102E"}]'),
  ('a54ade17-554b-551f-96b7-a25ad6914b88', 'yaris', 'Toyota', 'Yaris', 'hatch', 'แฮทช์แบ็กสำหรับชีวิตประจำวัน ขนาดกะทัดรัด จอดง่าย และจัดพื้นที่ห้องโดยสารให้ใช้งานได้หลากหลาย', 'พร้อมส่ง', 0, 'Sport Premium', '1.2 ลิตร เบนซิน', 92, 'อัตโนมัติ CVT', 'ขับเคลื่อนล้อหน้า', 'เบนซิน', 5, 'โชว์รูมกรุงเทพฯ', 'รับประกันตามเงื่อนไขผู้ผลิต', '["ตัวถัง 5 ประตู","เบาะหลังพับเพิ่มพื้นที่เก็บของ","ระบบเชื่อมต่อโทรศัพท์","ระบบช่วยขับขี่"]', '[{"name":"ขาวมุก","value":"#F2F0E9","images":["https://www.toyota.co.th/media/product/series/colors/v/yaris/39/ab4de76e4836b11a50307970c6a611383964227ca48bd4152739fcea999aac60.webp"]},{"name":"แดง","value":"#C8102E","images":["https://www.toyotabkk.com/wp-content/uploads/2023/03/062b6d5a3868c67b842bc77a78dacadd45e330d4b7516711e9cdd92158bf00f0.webp"]},{"name":"น้ำเงินเทา","value":"#526879","images":["https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Toyota_Yaris_Z_URBANO_%28XP210%2C_2024_facelift%29_%28front_three-quarter_view%29_in_Osaka%2C_Japan.jpg/960px-Toyota_Yaris_Z_URBANO_%28XP210%2C_2024_facelift%29_%28front_three-quarter_view%29_in_Osaka%2C_Japan.jpg"]},{"name":"ดำ","value":"#202126"}]'),
  ('2b462c4c-a7f6-5fb2-b09f-9717c76583c4', 'corolla-altis-hybrid', 'Toyota', 'Corolla Altis Hybrid', 'sedan', 'ซีดานไฮบริดสำหรับผู้ที่ต้องการความนุ่มนวลและความประหยัดในการเดินทางทั้งในเมืองและนอกเมือง', 'ไฮบริด', 1, 'Hybrid Premium', '1.8 ลิตร เบนซิน + มอเตอร์ไฟฟ้า', 122, 'e-CVT', 'ขับเคลื่อนล้อหน้า', 'ไฮบริด', 5, 'โชว์รูมกรุงเทพฯ', 'รับประกันตามเงื่อนไขผู้ผลิต', '["ระบบขับเคลื่อนไฮบริด","ระบบช่วยเหลือผู้ขับขี่","เบาะนั่ง 5 ที่นั่ง","พื้นที่เก็บสัมภาระท้ายรถ"]', '[{"name":"ดำ","value":"#202126","images":["https://www.toyota.co.th/media/product/series/colors/v/altis/19/aba25a93e98308b47fceb7f134b51e9de57e88c9255509ef119352f5923de2a1.webp"]},{"name":"เงิน","value":"#A7ADB5","images":["https://assets.brandinside.asia/uploads/2019/09/PRimg-20190904075113.jpg"]},{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"แดง","value":"#C8102E"}]'),
  ('63e78535-8b0a-5122-8527-40d5f853c6c0', 'camry', 'Toyota', 'Camry', 'sedan', 'ซีดานระดับพรีเมียมที่เน้นความสบายของผู้โดยสาร พื้นที่ห้องโดยสารกว้าง และระบบขับเคลื่อนที่ตอบโจทย์การเดินทางไกล', 'พรีเมียม', 0, 'HEV Premium Luxury', '2.5 ลิตร เบนซิน + มอเตอร์ไฟฟ้า', 230, 'e-CVT', 'ขับเคลื่อนล้อหน้า', 'ไฮบริด', 5, 'โชว์รูมกรุงเทพฯ', 'รับประกันตามเงื่อนไขผู้ผลิต', '["ห้องโดยสารระดับพรีเมียม","ระบบไฮบริด","ระบบช่วยเหลือการขับขี่","เบาะนั่งปรับไฟฟ้าในรุ่นที่กำหนด"]', '[{"name":"สีในภาพหลัก","value":"#E8E8E4"},{"name":"ดำ","value":"#202126"},{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"เทาเงิน","value":"#A7ADB5"},{"name":"แดง","value":"#C8102E"},{"name":"น้ำเงิน","value":"#32547D"}]'),
  ('881adb35-fa89-57d8-86cd-c0d37f0dda04', 'corolla-cross', 'Toyota', 'Corolla Cross Hybrid', 'suv', 'SUV ครอบครัวขนาดกะทัดรัด ช่วงล่างสำหรับการใช้งานประจำวัน ห้องโดยสารกว้าง และทัศนวิสัยการขับขี่ที่ดี', 'ไฮบริด', 1, 'Hybrid Smart', '1.8 ลิตร เบนซิน + มอเตอร์ไฟฟ้า', 122, 'e-CVT', 'ขับเคลื่อนล้อหน้า', 'ไฮบริด', 5, 'โชว์รูมกรุงเทพฯ', 'รับประกันตามเงื่อนไขผู้ผลิต', '["ระบบไฮบริด","พื้นที่เก็บสัมภาระท้ายรถ","ระบบความปลอดภัย Toyota Safety Sense ในรุ่นที่กำหนด","เบาะนั่ง 5 ที่นั่ง"]', '[{"name":"สีในภาพหลัก","value":"#B8BBC2"},{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"ดำ","value":"#202126"},{"name":"เทาเงิน","value":"#A7ADB5"},{"name":"แดง","value":"#C8102E"}]'),
  ('d55fe078-bf95-51f5-8ca7-6b041e387101', 'yaris-cross', 'Toyota', 'Yaris Cross HEV', 'suv', 'ครอสโอเวอร์ไฮบริดสำหรับคนเมือง ให้ตำแหน่งนั่งสูง พื้นที่เก็บของยืดหยุ่น และขนาดเหมาะกับการใช้งานทุกวัน', 'พร้อมจอง', 1, 'Premium Luxury', '1.5 ลิตร เบนซิน + มอเตอร์ไฟฟ้า', 111, 'e-CVT', 'ขับเคลื่อนล้อหน้า', 'ไฮบริด', 5, 'โชว์รูมกรุงเทพฯ', 'รับประกันตามเงื่อนไขผู้ผลิต', '["ระบบไฮบริด","ฝาท้ายเปิดใช้งานสะดวกในรุ่นที่กำหนด","ระบบช่วยขับขี่","เบาะนั่ง 5 ที่นั่ง"]', '[{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"ดำ","value":"#202126"},{"name":"เทาเงิน","value":"#A7ADB5"},{"name":"แดง","value":"#C8102E"}]'),
  ('66eb95f2-4707-5bbe-bb14-2fe6d83a98fc', 'fortuner', 'Toyota', 'Fortuner', 'suv', 'SUV 7 ที่นั่งที่ออกแบบสำหรับครอบครัวและการเดินทางไกล มีพื้นที่โดยสารหลายแถวและตัวเลือกระบบขับเคลื่อนตามรุ่นย่อย', 'พร้อมส่ง', 0, '2.4 Leader', '2.4 ลิตร ดีเซลเทอร์โบ', 150, 'อัตโนมัติ 6 สปีด', 'ขับเคลื่อนล้อหลัง / 4 ล้อ ตามรุ่น', 'ดีเซล', 7, 'โชว์รูมกรุงเทพฯ', 'รับประกันตามเงื่อนไขผู้ผลิต', '["ห้องโดยสาร 7 ที่นั่ง","เครื่องยนต์ดีเซลเทอร์โบ","ตัวเลือกขับเคลื่อน 4 ล้อในบางรุ่น","พื้นที่เก็บสัมภาระปรับเปลี่ยนได้"]', '[{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"ดำ","value":"#202126"},{"name":"เทาเงิน","value":"#A7ADB5"},{"name":"แดง","value":"#C8102E"}]'),
  ('f2653146-c41e-5bca-90cf-047d1c3481ed', 'hilux-revo', 'Toyota', 'Hilux Revo', 'pickup', 'รถกระบะสำหรับงานบรรทุกและการใช้งานเชิงพาณิชย์ เลือกรูปแบบห้องโดยสารและระบบขับเคลื่อนได้ตามความต้องการ', 'พร้อมส่ง', 0, '2.4 Standard Cab', '2.4 ลิตร ดีเซลเทอร์โบ', 150, 'ธรรมดา 6 สปีด', 'ขับเคลื่อนล้อหลัง', 'ดีเซล', 2, 'คลังรถปทุมธานี', 'รับประกันตามเงื่อนไขผู้ผลิต', '["กระบะท้ายสำหรับบรรทุก","เครื่องยนต์ดีเซล","มีหลายรูปแบบตัวถัง","เหมาะกับงานธุรกิจและการเดินทาง"]', '[{"name":"สีในภาพหลัก","value":"#E8E8E4"},{"name":"ขาว","value":"#F2F0E9"},{"name":"เทาเข้ม","value":"#454A51"},{"name":"ดำ","value":"#202126"},{"name":"แดง","value":"#C8102E"}]'),
  ('97665f94-581e-5ace-882c-2718e5e1c76e', 'gr-supra', 'Toyota', 'GR Supra', 'sport', 'รถสปอร์ตสองที่นั่งที่เน้นสมรรถนะและการควบคุม เหมาะกับผู้ที่มองหารถขับสนุกพร้อมดีไซน์สปอร์ตชัดเจน', 'รถสปอร์ต', 1, '3.0 Premium', '3.0 ลิตร 6 สูบ เทอร์โบ', 387, 'อัตโนมัติ 8 สปีด', 'ขับเคลื่อนล้อหลัง', 'เบนซิน', 2, 'โชว์รูมรถสปอร์ต', 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย', '["เครื่องยนต์ 6 สูบเทอร์โบ","ขับเคลื่อนล้อหลัง","ห้องโดยสาร 2 ที่นั่ง","ระบบช่วยควบคุมการทรงตัว"]', '[{"name":"สีในภาพหลัก","value":"#D9E0E7"},{"name":"น้ำเงิน","value":"#2867B5"},{"name":"แดง","value":"#C8102E"},{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"ดำ","value":"#202126"},{"name":"เทาเงิน","value":"#969CA5"}]'),
  ('8a9fa1bc-6ba4-50ff-a862-f9f532ab55dc', 'ferrari-296-gtb', 'Ferrari', '296 GTB', 'supercar', 'ซูเปอร์คาร์เครื่องยนต์วางกลางที่ผสานเครื่องยนต์ V6 เทอร์โบกับระบบไฟฟ้า โดดเด่นด้านการตอบสนองและรูปทรงตามหลักอากาศพลศาสตร์', 'ซูเปอร์คาร์', 1, 'V6 Hybrid', '3.0 ลิตร V6 Twin-Turbo + มอเตอร์ไฟฟ้า', 830, 'DCT 8 สปีด', 'ขับเคลื่อนล้อหลัง', 'Plug-in Hybrid', 2, 'โชว์รูมรถพรีเมียม', 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย', '["ระบบขับเคลื่อน Plug-in Hybrid","เครื่องยนต์ V6 Twin-Turbo","ห้องโดยสาร 2 ที่นั่ง","ตัวถังสปอร์ตวางเครื่องยนต์กลาง"]', '[{"name":"แดง","value":"#C8102E","images":["https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_1_2560x1440.jpg","https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_2_2560x1440.jpg","https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_3_2560x1440.jpg"]},{"name":"ดำ","value":"#202126"},{"name":"เหลือง","value":"#EACB20"},{"name":"ขาวมุก","value":"#F2F0E9"}]'),
  ('8b2ccb45-dd68-510d-8e36-51ac458b0844', 'lamborghini-huracan', 'Lamborghini', 'Huracán EVO', 'supercar', 'ซูเปอร์คาร์เครื่องยนต์ V10 ที่เน้นเสียงเครื่องยนต์ คาแรกเตอร์สปอร์ต และการออกแบบที่โดดเด่น', 'ซูเปอร์คาร์', 1, 'EVO V10', '5.2 ลิตร V10', 640, 'DCT 7 สปีด', 'ขับเคลื่อน 4 ล้อ ตามรุ่น', 'เบนซิน', 2, 'สั่งรถตามคำขอ', 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย', '["เครื่องยนต์ V10","ตัวถังทรงสปอร์ต","ห้องโดยสาร 2 ที่นั่ง","ระบบควบคุมการขับขี่หลายโหมด"]', '[{"name":"ส้ม","value":"#F07821","images":["https://www.planetcarsz.com/assets/uploads/2019/03/LAMBORGHINI%20HURACAN%20EVO%202019%200007.jpg"]},{"name":"เหลือง","value":"#EACB20","images":["https://s1.cdn.autoevolution.com/images/news/gallery/watch-this-lamborghini-huracan-drift-donut-crash-into-barrier-then-catch-fire_15.jpg"]},{"name":"ดำ","value":"#202126"},{"name":"ขาวมุก","value":"#F2F0E9"}]'),
  ('3cd28c06-dda9-54f1-a58e-de10522255bc', 'porsche-911-carrera', 'Porsche', '911 Carrera', 'sport', 'รถสปอร์ตที่ผสานสมรรถนะกับการใช้งานจริงในชีวิตประจำวัน มีพื้นที่นั่งแบบ 2+2 และรูปทรงอันเป็นเอกลักษณ์', 'สปอร์ตพรีเมียม', 1, 'Carrera Coupe', '3.0 ลิตร Flat-six Twin-Turbo', 388, 'PDK 8 สปีด', 'ขับเคลื่อนล้อหลัง', 'เบนซิน', 4, 'โชว์รูมรถสปอร์ต', 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย', '["เครื่องยนต์ Flat-six เทอร์โบ","เกียร์ PDK","รูปแบบเบาะ 2+2","ระบบช่วยเหลือการขับขี่"]', '[{"name":"สีในภาพหลัก","value":"#F0F0EC"},{"name":"น้ำเงิน","value":"#2867B5"},{"name":"แดง","value":"#C8102E"},{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"ดำ","value":"#202126"},{"name":"เทาเงิน","value":"#969CA5"}]'),
  ('679938f5-c8f3-5ef1-8fce-0b712d569376', 'bmw-m4-competition', 'BMW', 'M4 Competition', 'sport', 'คูเป้สมรรถนะสูงที่ผสานกำลังเครื่องยนต์กับความสะดวกสบายในห้องโดยสาร เหมาะกับผู้ที่ต้องการรถสปอร์ตใช้ได้ทุกวัน', 'สปอร์ตพรีเมียม', 0, 'Competition Coupé', '3.0 ลิตร 6 สูบ Twin-Turbo', 510, 'อัตโนมัติ 8 สปีด', 'ขึ้นกับรุ่นย่อย', 'เบนซิน', 4, 'โชว์รูมรถสปอร์ต', 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย', '["เครื่องยนต์ 6 สูบเทอร์โบ","ตัวถังคูเป้ 2 ประตู","โหมดการขับขี่หลายรูปแบบ","ห้องโดยสาร 4 ที่นั่ง"]', '[{"name":"น้ำเงิน","value":"#2867B5"},{"name":"แดง","value":"#C8102E"},{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"ดำ","value":"#202126"},{"name":"เทาเงิน","value":"#969CA5"}]'),
  ('dc479d12-7474-5956-abfa-fd94f1675f4b', 'nissan-gt-r', 'Nissan', 'GT-R Premium', 'sport', 'รถสปอร์ตสมรรถนะสูงที่มีระบบขับเคลื่อนสี่ล้อและระบบควบคุมที่ออกแบบมาเพื่อการขับขี่แบบสปอร์ต', 'สมรรถนะสูง', 0, 'Premium Edition', '3.8 ลิตร V6 Twin-Turbo', 565, 'DCT 6 สปีด', 'ขับเคลื่อน 4 ล้อ', 'เบนซิน', 4, 'สั่งรถตามคำขอ', 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย', '["เครื่องยนต์ V6 Twin-Turbo","ระบบขับเคลื่อน 4 ล้อ","ห้องโดยสาร 2+2","ระบบควบคุมการทรงตัว"]', '[{"name":"น้ำเงิน","value":"#2867B5","images":["https://www.autoblog.com/.image/MjA5MTc4Mjc4NjIzNzgyNzU2/2012%20Nissan%20GT-R.jpg?profile=w1536&x=50&y=50"]},{"name":"เทาเงิน","value":"#969CA5"},{"name":"ดำ","value":"#202126"},{"name":"ขาวมุก","value":"#F2F0E9"}]'),
  ('37a61c8c-cf98-5abd-9ddb-dcf9b9de38f4', 'byd-seal', 'BYD', 'SEAL Premium', 'ev', 'รถยนต์ไฟฟ้าทรงซีดานที่เน้นการตอบสนองของมอเตอร์ ความเงียบในการขับขี่ และอุปกรณ์ภายในที่ทันสมัย', 'รถยนต์ไฟฟ้า', 0, 'Premium RWD', 'มอเตอร์ไฟฟ้า', 313, 'Single-speed', 'ขับเคลื่อนล้อหลัง', 'ไฟฟ้า 100%', 5, 'โชว์รูมรถไฟฟ้า', 'ตรวจสอบเงื่อนไขแบตเตอรี่และตัวรถก่อนซื้อ', '["ขับเคลื่อนด้วยไฟฟ้า 100%","ระบบชาร์จไฟ","ระบบช่วยเหลือการขับขี่","ห้องโดยสาร 5 ที่นั่ง"]', '[{"name":"น้ำเงิน","value":"#2B5A92","images":["https://asset.carwyapar.com/Car%20Images/BYD/Seal/BYD-Seal-Premium/sidefront.webp"]},{"name":"ฟ้าเงิน","value":"#AFC3D8","images":["https://www.bratislavak.sk/assets/images/ba/articles/img-inline/byd-20260423033116.webp"]},{"name":"ขาวมุก","value":"#F2F0E9"},{"name":"ดำ","value":"#202126"}]')
ON DUPLICATE KEY UPDATE
  featured = IF(slug IS NULL, VALUES(featured), featured),
  slug = COALESCE(slug, VALUES(slug)),
  tag = COALESCE(tag, VALUES(tag)),
  variant = COALESCE(variant, VALUES(variant)),
  engine = COALESCE(engine, VALUES(engine)),
  horsepower = COALESCE(horsepower, VALUES(horsepower)),
  transmission = COALESCE(transmission, VALUES(transmission)),
  drive = COALESCE(drive, VALUES(drive)),
  fuel = COALESCE(fuel, VALUES(fuel)),
  seats = COALESCE(seats, VALUES(seats)),
  location = COALESCE(location, VALUES(location)),
  warranty = COALESCE(warranty, VALUES(warranty)),
  features = COALESCE(features, VALUES(features)),
  color_options = COALESCE(color_options, VALUES(color_options));

-- cars (one row per physical car)
INSERT IGNORE INTO cars (id, car_model_id, vin, color, manufacture_year, price, status) VALUES
  ('3689f10c-7b75-52fb-ac9e-e0a4924b64b4', '4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'DEMO0000000000001', '#414852', 2025, 569000.00, 'AVAILABLE'),
  ('d314d11c-4bcb-5824-9864-d0afebaa019a', '4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'DEMO0000000000002', '#414852', 2025, 569000.00, 'AVAILABLE'),
  ('f0e5b2e0-6356-509d-a166-f96cda95f569', '4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'DEMO0000000000003', '#414852', 2025, 569000.00, 'AVAILABLE'),
  ('e77a5d9f-48c5-5be8-8231-44eb68254b2a', '4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'DEMO0000000000004', '#414852', 2025, 569000.00, 'AVAILABLE'),
  ('4a5967c1-1db6-5652-99e6-b397b006f396', '4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'DEMO0000000000005', '#414852', 2025, 569000.00, 'AVAILABLE'),
  ('a3424d18-f849-548a-a186-0c2dee724b84', '4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'DEMO0000000000006', '#414852', 2025, 569000.00, 'AVAILABLE'),
  ('6a90bac4-e132-55df-bc7f-32fb717bc3b4', '4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'DEMO0000000000007', '#414852', 2025, 569000.00, 'AVAILABLE'),
  ('d9138da1-2b2b-52d8-a087-6b6294c0ca05', '4ed1f870-3b95-5385-be66-bb4f7617f8d1', 'DEMO0000000000008', '#414852', 2025, 569000.00, 'AVAILABLE'),
  ('e296e912-4ef4-5a0a-9493-ae793be24f0e', 'a54ade17-554b-551f-96b7-a25ad6914b88', 'DEMO0000000000009', '#F2F0E9', 2025, 584000.00, 'AVAILABLE'),
  ('f6c46c69-8c3e-5ad0-b6ab-0a79cbf08bb4', 'a54ade17-554b-551f-96b7-a25ad6914b88', 'DEMO0000000000010', '#F2F0E9', 2025, 584000.00, 'AVAILABLE'),
  ('d917324c-95f2-5986-9c32-64cc7fd8a99e', 'a54ade17-554b-551f-96b7-a25ad6914b88', 'DEMO0000000000011', '#F2F0E9', 2025, 584000.00, 'AVAILABLE'),
  ('fbe6709f-caeb-526b-a475-50cc4eb24468', 'a54ade17-554b-551f-96b7-a25ad6914b88', 'DEMO0000000000012', '#F2F0E9', 2025, 584000.00, 'AVAILABLE'),
  ('ea738273-11e2-568f-9714-aed6e3a631c2', 'a54ade17-554b-551f-96b7-a25ad6914b88', 'DEMO0000000000013', '#F2F0E9', 2025, 584000.00, 'AVAILABLE'),
  ('f6cf71b9-791c-53d9-bcd7-9a09d2007cbd', '2b462c4c-a7f6-5fb2-b09f-9717c76583c4', 'DEMO0000000000014', '#202126', 2025, 909000.00, 'AVAILABLE'),
  ('0bb90811-2e9c-5d6b-8372-845e4c77e89b', '2b462c4c-a7f6-5fb2-b09f-9717c76583c4', 'DEMO0000000000015', '#202126', 2025, 909000.00, 'AVAILABLE'),
  ('428e6db9-e9bf-534f-9a94-e8e7149b9f03', '2b462c4c-a7f6-5fb2-b09f-9717c76583c4', 'DEMO0000000000016', '#202126', 2025, 909000.00, 'AVAILABLE'),
  ('ec68ee74-8fdc-5c76-a0f3-a329acbfc2a6', '2b462c4c-a7f6-5fb2-b09f-9717c76583c4', 'DEMO0000000000017', '#202126', 2025, 909000.00, 'AVAILABLE'),
  ('2b5af152-a03d-5451-aeff-df49f3f674c6', '63e78535-8b0a-5122-8527-40d5f853c6c0', 'DEMO0000000000018', '#E8E8E4', 2025, 1589000.00, 'AVAILABLE'),
  ('d4862edf-700e-53cc-b955-064d6129da27', '63e78535-8b0a-5122-8527-40d5f853c6c0', 'DEMO0000000000019', '#E8E8E4', 2025, 1589000.00, 'AVAILABLE'),
  ('6321ab30-91be-593e-964f-88329f5ab02b', '881adb35-fa89-57d8-86cd-c0d37f0dda04', 'DEMO0000000000020', '#B8BBC2', 2025, 889000.00, 'AVAILABLE'),
  ('328aeaea-267e-5916-ae3e-cb01f2dde3ec', '881adb35-fa89-57d8-86cd-c0d37f0dda04', 'DEMO0000000000021', '#B8BBC2', 2025, 889000.00, 'AVAILABLE'),
  ('279b1e38-e231-57c7-8f51-d48fd896ac58', '881adb35-fa89-57d8-86cd-c0d37f0dda04', 'DEMO0000000000022', '#B8BBC2', 2025, 889000.00, 'AVAILABLE'),
  ('ac47a4ae-304c-5a78-9c6d-0236f5b1bfc9', '881adb35-fa89-57d8-86cd-c0d37f0dda04', 'DEMO0000000000023', '#B8BBC2', 2025, 889000.00, 'AVAILABLE'),
  ('a89adb9c-c2a6-5286-9a16-a72e5cd4b2be', '881adb35-fa89-57d8-86cd-c0d37f0dda04', 'DEMO0000000000024', '#B8BBC2', 2025, 889000.00, 'AVAILABLE'),
  ('ae945643-0629-512d-ab6c-debd10b335cb', '881adb35-fa89-57d8-86cd-c0d37f0dda04', 'DEMO0000000000025', '#B8BBC2', 2025, 889000.00, 'AVAILABLE'),
  ('faa3df86-de5f-5c18-95e4-88da9fdbb147', 'd55fe078-bf95-51f5-8ca7-6b041e387101', 'DEMO0000000000026', '#C8102E', 2025, 799000.00, 'AVAILABLE'),
  ('ca512287-d656-5c27-bfb6-9b836bcdd137', 'd55fe078-bf95-51f5-8ca7-6b041e387101', 'DEMO0000000000027', '#C8102E', 2025, 799000.00, 'AVAILABLE'),
  ('e6d8c75b-1f6e-5410-a75c-6d829d6914b9', 'd55fe078-bf95-51f5-8ca7-6b041e387101', 'DEMO0000000000028', '#C8102E', 2025, 799000.00, 'AVAILABLE'),
  ('1419d809-8d83-5a23-acda-7e33d41f0644', '66eb95f2-4707-5bbe-bb14-2fe6d83a98fc', 'DEMO0000000000029', '#F2F0E9', 2025, 1349000.00, 'AVAILABLE'),
  ('0085267a-0360-5361-830f-f55ae2b6be88', '66eb95f2-4707-5bbe-bb14-2fe6d83a98fc', 'DEMO0000000000030', '#F2F0E9', 2025, 1349000.00, 'AVAILABLE'),
  ('409cf5c2-d0d1-530e-ab23-434e4a018118', 'f2653146-c41e-5bca-90cf-047d1c3481ed', 'DEMO0000000000031', '#E8E8E4', 2025, 549000.00, 'AVAILABLE'),
  ('9d425b93-f795-5ed7-b2c8-df51d1c63396', 'f2653146-c41e-5bca-90cf-047d1c3481ed', 'DEMO0000000000032', '#E8E8E4', 2025, 549000.00, 'AVAILABLE'),
  ('47e1da36-1d11-5298-a628-de88d90a4f72', 'f2653146-c41e-5bca-90cf-047d1c3481ed', 'DEMO0000000000033', '#E8E8E4', 2025, 549000.00, 'AVAILABLE'),
  ('2a8040e6-0f55-5707-b0a6-31b822095f5a', 'f2653146-c41e-5bca-90cf-047d1c3481ed', 'DEMO0000000000034', '#E8E8E4', 2025, 549000.00, 'AVAILABLE'),
  ('d40787b7-da01-565a-9eeb-93e884cc2044', 'f2653146-c41e-5bca-90cf-047d1c3481ed', 'DEMO0000000000035', '#E8E8E4', 2025, 549000.00, 'AVAILABLE'),
  ('cb13fabc-e58a-5d8c-8146-572409c35965', 'f2653146-c41e-5bca-90cf-047d1c3481ed', 'DEMO0000000000036', '#E8E8E4', 2025, 549000.00, 'AVAILABLE'),
  ('8281a157-a488-5b73-9327-40c777a5448f', 'f2653146-c41e-5bca-90cf-047d1c3481ed', 'DEMO0000000000037', '#E8E8E4', 2025, 549000.00, 'AVAILABLE'),
  ('7690cc48-2cbd-5f01-86f7-dc125cc7df85', '97665f94-581e-5ace-882c-2718e5e1c76e', 'DEMO0000000000038', '#D9E0E7', 2025, 5349000.00, 'AVAILABLE'),
  ('9d000d58-e7f9-5b1e-be49-c210d31acb07', '8a9fa1bc-6ba4-50ff-a862-f9f532ab55dc', 'DEMO0000000000039', '#C8102E', 2025, 29900000.00, 'AVAILABLE'),
  ('986dfc1a-4d49-5b33-8e96-ddc30d8013a5', '8b2ccb45-dd68-510d-8e36-51ac458b0844', 'DEMO0000000000040', '#F07821', 2024, 22500000.00, 'INACTIVE'),
  ('03299e46-cf05-550c-9f0f-1e93347d3e3c', '3cd28c06-dda9-54f1-a58e-de10522255bc', 'DEMO0000000000041', '#F0F0EC', 2025, 12900000.00, 'AVAILABLE'),
  ('9f92f4bb-c1c9-56c3-9c7e-f64c407e6063', '679938f5-c8f3-5ef1-8fce-0b712d569376', 'DEMO0000000000042', '#2867B5', 2025, 9999000.00, 'AVAILABLE'),
  ('3938a9d7-c489-5857-b0a9-4a229113eac0', '679938f5-c8f3-5ef1-8fce-0b712d569376', 'DEMO0000000000043', '#2867B5', 2025, 9999000.00, 'AVAILABLE'),
  ('379c4f90-f04c-5cc8-8ec9-19f619cff726', 'dc479d12-7474-5956-abfa-fd94f1675f4b', 'DEMO0000000000044', '#2867B5', 2024, 12500000.00, 'INACTIVE'),
  ('0b3afb4d-a363-58a0-b25b-3b8c21ea636d', '37a61c8c-cf98-5abd-9ddb-dcf9b9de38f4', 'DEMO0000000000045', '#2B5A92', 2025, 1299000.00, 'AVAILABLE'),
  ('05fd862e-7739-531c-b83c-7e1fd7ae17c7', '37a61c8c-cf98-5abd-9ddb-dcf9b9de38f4', 'DEMO0000000000046', '#2B5A92', 2025, 1299000.00, 'AVAILABLE'),
  ('8a12f031-33a5-5df6-a22b-6dff930b89f3', '37a61c8c-cf98-5abd-9ddb-dcf9b9de38f4', 'DEMO0000000000047', '#2B5A92', 2025, 1299000.00, 'AVAILABLE');

-- car_images
INSERT IGNORE INTO car_images (id, car_id, image_path, sort_order) VALUES
  ('19af43f9-6e15-5017-8a7a-ed8f950a71e6', '3689f10c-7b75-52fb-ac9e-e0a4924b64b4', 'https://toyotavorachakyont.com/image/model/YARIS%20ATIV/line-up/HEV%20Premium_HEV_Premium_Urban_Metal.webp', 0),
  ('d717a8c4-e297-5ecd-85b1-c0d0f6c33c48', '3689f10c-7b75-52fb-ac9e-e0a4924b64b4', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/2025_Toyota_Yaris_ATIV_HEV_Premium_%282%29.jpg/1280px-2025_Toyota_Yaris_ATIV_HEV_Premium_%282%29.jpg', 1),
  ('ef4c433c-21d2-565b-b52b-24baed5fbd99', '3689f10c-7b75-52fb-ac9e-e0a4924b64b4', 'https://pgw.udn.com.tw/gw/photo.php?exp=3600&fw=930&nt=1&sh=0&sl=W&sw=0&u=https%3A%2F%2Fuc.udn.com.tw%2Fphoto%2F2022%2F08%2F09%2F0%2F18254127.jpg&x=0&y=0', 2),
  ('02e060c5-3f52-5c49-8592-6b44b5235807', 'e296e912-4ef4-5a0a-9493-ae793be24f0e', 'https://www.toyota.co.th/media/product/series/colors/v/yaris/39/ab4de76e4836b11a50307970c6a611383964227ca48bd4152739fcea999aac60.webp', 0),
  ('c39e15bc-52f2-5add-86ec-6d0a6f02f574', 'e296e912-4ef4-5a0a-9493-ae793be24f0e', 'https://www.toyotabkk.com/wp-content/uploads/2023/03/062b6d5a3868c67b842bc77a78dacadd45e330d4b7516711e9cdd92158bf00f0.webp', 1),
  ('0978fd0d-bb3a-52bf-83f1-fca32847f00d', 'e296e912-4ef4-5a0a-9493-ae793be24f0e', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Toyota_Yaris_Z_URBANO_%28XP210%2C_2024_facelift%29_%28front_three-quarter_view%29_in_Osaka%2C_Japan.jpg/960px-Toyota_Yaris_Z_URBANO_%28XP210%2C_2024_facelift%29_%28front_three-quarter_view%29_in_Osaka%2C_Japan.jpg', 2),
  ('cbfa9a43-e03d-55f5-b4c1-f804c4e4bb6e', 'f6cf71b9-791c-53d9-bcd7-9a09d2007cbd', 'https://www.toyota.co.th/media/product/series/colors/v/altis/19/aba25a93e98308b47fceb7f134b51e9de57e88c9255509ef119352f5923de2a1.webp', 0),
  ('5baf2dc3-09c5-56eb-8706-b59e9325ecae', 'f6cf71b9-791c-53d9-bcd7-9a09d2007cbd', 'https://assets.brandinside.asia/uploads/2019/09/PRimg-20190904075113.jpg', 1),
  ('59dbea09-7dd7-532f-934f-5650cfd37d0a', '2b5af152-a03d-5451-aeff-df49f3f674c6', 'https://pictures.dealer.com/m/mcgeetoyotascionofdudley/1234/74cc1ed118ff4301aa8a08279a5b4b14.jpg', 0),
  ('070b223b-e64d-5162-b434-81f7dc61c4a6', '2b5af152-a03d-5451-aeff-df49f3f674c6', 'https://citymagazine.b-cdn.net/wp-content/uploads/2024/08/2025_Camry_XSE_AWD_HeavyMetalBlackRoof_003-1400x933.webp', 1),
  ('492ed210-e54e-5047-a0ee-39727d9b0ba3', '6321ab30-91be-593e-964f-88329f5ab02b', 'https://cdn.motor1.com/images/mgl/QebKn8/s1/toyota-corolla-cross-2025-la-prova-su-strada.jpg', 0),
  ('76bf7903-17bd-51c9-8483-dea0746908f4', '6321ab30-91be-593e-964f-88329f5ab02b', 'https://eurotarget.com/foto/Regole/20/5168/4_800x0.jpg', 1),
  ('ac39a361-8bf9-5cc5-b9f4-0719615da070', 'faa3df86-de5f-5c18-95e4-88da9fdbb147', 'https://drivetripper.com/userfiles2020/images/ALL-NEW-YARIS-CROSS-HEV-PREMIUM-LUXURY_05.jpg', 0),
  ('7296df77-1a42-50b1-a74a-2ba8172a73a4', 'faa3df86-de5f-5c18-95e4-88da9fdbb147', 'https://d1tjylbhswro2u.cloudfront.net/images/posts/2025/08/post27702_1.jpg', 1),
  ('dd0d39ab-0022-5689-a1e8-fe522d276170', '1419d809-8d83-5a23-acda-7e33d41f0644', 'https://carprices.ae/uploads/api_uploads_img_car_gallery_2023_toyota_fortuner_4_0l_vxr_3_4a0c66dd4b.jpg', 0),
  ('1a556279-d7ef-5a4a-b412-09e5e801e83a', '1419d809-8d83-5a23-acda-7e33d41f0644', 'https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg', 1),
  ('e472a888-ebe3-58d6-babe-ea0d1d4b7743', '409cf5c2-d0d1-530e-ab23-434e4a018118', 'https://img.kaidee.com/prd/20260623/371433590/m/19c50fc9-4683-49b9-b501-808b9c8716fd.jpg', 0),
  ('3f70a326-95df-5f2e-b438-c7a6a492f5ff', '409cf5c2-d0d1-530e-ab23-434e4a018118', 'https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg', 1),
  ('c688ffb5-ad20-5191-a08e-80c5053280be', '7690cc48-2cbd-5f01-86f7-dc125cc7df85', 'https://images.pistonheads.com/nimg/45612/10.jpg', 0),
  ('0b7708d7-8bb6-58d4-8cb7-64d396520310', '7690cc48-2cbd-5f01-86f7-dc125cc7df85', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=85', 1),
  ('5592cd76-f1b6-574f-b887-4245c58d1f8b', '9d000d58-e7f9-5b1e-be49-c210d31acb07', 'https://cdn.motor1.com/images/mgl/OkpwL/s3/ferrari-296-gtb.jpg', 0),
  ('c80a0691-9f20-5d62-b52b-154f918f339b', '9d000d58-e7f9-5b1e-be49-c210d31acb07', 'https://editorial.pxcrush.net/carsales/general/editorial/ferrari-296-gtb-02.jpg', 1),
  ('7b890323-0526-5671-aaeb-111f5dbb7eb4', '9d000d58-e7f9-5b1e-be49-c210d31acb07', 'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_1_2560x1440.jpg', 2),
  ('88712071-6410-5c7d-8b1a-54b7fd9bbdc6', '9d000d58-e7f9-5b1e-be49-c210d31acb07', 'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_2_2560x1440.jpg', 3),
  ('45316bd7-707b-5fd6-8e90-55f75e2dc157', '9d000d58-e7f9-5b1e-be49-c210d31acb07', 'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_3_2560x1440.jpg', 4),
  ('d3a594d0-c4ef-537c-9492-3b4f57634152', '986dfc1a-4d49-5b33-8e96-ddc30d8013a5', 'https://www.planetcarsz.com/assets/uploads/2019/03/LAMBORGHINI%20HURACAN%20EVO%202019%200007.jpg', 0),
  ('c3f3a2a3-0c4b-538c-a167-e1f13e7a74ac', '986dfc1a-4d49-5b33-8e96-ddc30d8013a5', 'https://immagini.alvolante.it/sites/default/files/styles/image_gallery_big/public/news_galleria/2013/12/lamborghini-huracan-spy_4.jpg', 1),
  ('243bb555-ea65-551d-966e-433c63a86b6c', '986dfc1a-4d49-5b33-8e96-ddc30d8013a5', 'https://s1.cdn.autoevolution.com/images/news/gallery/watch-this-lamborghini-huracan-drift-donut-crash-into-barrier-then-catch-fire_15.jpg', 2),
  ('b65150a2-ae7f-55fe-94cc-0e37e0d79910', '03299e46-cf05-550c-9f0f-1e93347d3e3c', 'https://car.go.th/api/v1/file/data?file_id=d499250bd7024467ae0129eddcbb4afc', 0),
  ('763dba33-dd8d-5c8a-bb35-872694985a4a', '03299e46-cf05-550c-9f0f-1e93347d3e3c', 'https://www.carrerafever.net/wp-content/uploads/2025-Porsche-911-Carrera-Specs.jpg', 1),
  ('8b2d4c6c-27bc-517d-bb06-71ddb94002a0', '9f92f4bb-c1c9-56c3-9c7e-f64c407e6063', 'https://d2mq8ajyfy4fws.cloudfront.net/wp-content/uploads/2024/11/27104805/fcd4b599232b3ff90b9ad8cb5572753a.jpg', 0),
  ('c196288b-b666-59b2-bb05-0fb361d33bb5', '9f92f4bb-c1c9-56c3-9c7e-f64c407e6063', 'https://editorial.pxcrush.net/carsales/general/editorial/2021_bmw_m4-1.jpg?height=682&width=1024', 1),
  ('3f9e431b-dde3-52bb-ae05-1fe869d0c3ee', '379c4f90-f04c-5cc8-8ec9-19f619cff726', 'https://www.autoblog.com/.image/MjA5MTc4Mjc4NjIzNzgyNzU2/2012%20Nissan%20GT-R.jpg?profile=w1536&x=50&y=50', 0),
  ('4758e325-6a21-5bef-b6c8-1771133e5760', '379c4f90-f04c-5cc8-8ec9-19f619cff726', 'https://img.goodfon.com/wallpaper/nbig/f/1d/nissan-gtr-r35-blue-front-sight.webp', 1),
  ('16b60630-2058-5047-b447-ca6c120c7e9e', '0b3afb4d-a363-58a0-b25b-3b8c21ea636d', 'https://asset.carwyapar.com/Car%20Images/BYD/Seal/BYD-Seal-Premium/sidefront.webp', 0),
  ('39a4a2a1-e4db-51a9-82ed-a58f48569db4', '0b3afb4d-a363-58a0-b25b-3b8c21ea636d', 'https://www.bratislavak.sk/assets/images/ba/articles/img-inline/byd-20260423033116.webp', 1);

-- promotions (start date 2026-11-01 is a placeholder; discount_value 0 where the offer is not a number)
INSERT INTO promotions (id, title, description, discount_type, discount_value, start_date, end_date, status, badge, subtitle, offer_text, conditions, applies_to) VALUES
  ('4af47561-714b-5a29-938c-e345af31f716', 'Trade-in Bonus', 'รับสิทธิประเมินรถคันเดิมและนำมูลค่าไปใช้เป็นส่วนลดรถคันใหม่ เหมาะกับลูกค้าที่ต้องการเปลี่ยนรถ', 'FIXED', 80000.00, '2026-11-01 00:00:00.000', '2026-12-31 23:59:59.000', 'ACTIVE', 'ข้อเสนอแนะนำ', 'นำรถเก่ามาแลกรถใหม่', 'โบนัสเพิ่มสูงสุด ฿80,000', 'ขึ้นกับสภาพรถ รุ่นรถ และผลการประเมินจากผู้จำหน่าย', 'รถทุกรุ่น'),
  ('dd65c76c-85c9-5339-82ab-cabcb3ff363f', 'Premium Care Package', 'ข้อเสนอแพ็กเกจดูแลหลังการขายสำหรับรถที่ร่วมรายการ เพิ่มความอุ่นใจในช่วงเริ่มต้นใช้งาน', 'FIXED', 0.00, '2026-11-01 00:00:00.000', '2026-12-31 23:59:59.000', 'ACTIVE', 'ยอดนิยม', 'แพ็กเกจดูแลรถสำหรับรถใหม่', 'ฟรีค่าบำรุงรักษาตามแพ็กเกจ', 'รายการตรวจเช็กและระยะเวลารับสิทธิ์เป็นไปตามเงื่อนไขแคมเปญ', 'รถยนต์นั่งและ SUV ที่ร่วมรายการ'),
  ('f1cdcb54-c531-58da-942e-01ef5f31a533', 'Hybrid Smart Deal', 'แนะนำสำหรับ Corolla Altis Hybrid, Corolla Cross Hybrid, Yaris Cross HEV และรุ่นที่ร่วมรายการ', 'FIXED', 0.00, '2026-11-01 00:00:00.000', '2026-11-30 23:59:59.000', 'ACTIVE', 'Hybrid', 'ข้อเสนอสำหรับรถไฮบริด', 'รับสิทธิพิเศษเมื่อจองรถไฮบริด', 'สิทธิประโยชน์และรุ่นที่ร่วมรายการต้องยืนยันกับผู้จำหน่ายก่อนทำสัญญา', 'รถไฮบริดที่ร่วมรายการ'),
  ('eed82ba0-1118-55b5-8db9-037db26cf821', 'Supercar Privilege', 'จัดเตรียมประสบการณ์ส่งมอบรถและคำแนะนำการใช้งานส่วนบุคคลสำหรับรถสปอร์ตและซูเปอร์คาร์', 'FIXED', 0.00, '2026-11-01 00:00:00.000', '2026-12-31 23:59:59.000', 'ACTIVE', 'Premium', 'ประสบการณ์สำหรับรถสปอร์ตและซูเปอร์คาร์', 'บริการส่งมอบรถแบบพิเศษ', 'ต้องจองนัดหมายล่วงหน้าและขึ้นกับรุ่นรถที่จำหน่าย', 'รถสปอร์ตและซูเปอร์คาร์'),
  ('6cf27df2-0692-5f35-8c5b-731fc0ebc4fb', 'Weekend Test Drive', 'ชวนทดลองนั่งและทดลองขับรถรุ่นที่สนใจ พร้อมรับคำแนะนำเปรียบเทียบรุ่นรถจากทีมขาย', 'FIXED', 0.00, '2026-11-01 00:00:00.000', '2026-12-31 23:59:59.000', 'ACTIVE', 'กิจกรรม', 'นัดทดลองขับในวันหยุด', 'รับของที่ระลึกเมื่อร่วมกิจกรรม', 'ต้องลงทะเบียนและยืนยันคิวทดลองขับล่วงหน้า ของที่ระลึกมีจำนวนจำกัด', 'รถรุ่นที่เปิดทดลองขับ')
ON DUPLICATE KEY UPDATE
  description = IF(conditions IS NULL, VALUES(description), description),
  badge = COALESCE(badge, VALUES(badge)),
  subtitle = COALESCE(subtitle, VALUES(subtitle)),
  offer_text = COALESCE(offer_text, VALUES(offer_text)),
  conditions = COALESCE(conditions, VALUES(conditions)),
  applies_to = COALESCE(applies_to, VALUES(applies_to));

-- Check
SELECT m.slug, m.brand, m.model_name, m.tag, m.featured, SUM(c.status = 'AVAILABLE') AS stock, MIN(c.price) AS price
FROM car_models m JOIN cars c ON c.car_model_id = m.id GROUP BY m.id ORDER BY m.brand, m.model_name;
SELECT title, badge, offer_text, end_date, status FROM promotions;