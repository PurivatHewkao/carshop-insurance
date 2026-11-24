-- Seed for the TOYOTY configurator: 4 models x 3 trims, 6 colours, 4 wheels and one
-- showroom car per model (used for test-drive appointments).
-- Run AFTER 07_toyoty_configurator.sql. Safe to re-run: ids are fixed UUIDs and rows that
-- already exist are left as they are, so prices or specs edited later are kept.
-- Names, prices and specs are draft values agreed on 24 Nov 2026; edit freely.
-- Prices: Eco = agreed starting price, Balanced +150,000, High Performance +350,000.
-- Showroom VINs starting with 'TYTOSHOWROOM' are placeholders.
SET NAMES utf8mb4;
USE carshop_sql;

-- paint colours
INSERT INTO paint_colors (id, code, name, hex, finish, price_extra, sort_order) VALUES
  ('b640dd7e-ddc2-58ab-a488-0f7e2ac3f687', 'white', 'ขาว', '#F4F4F2', 'SOLID', 0.00, 1),
  ('6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193', 'black', 'ดำ', '#202126', 'SOLID', 0.00, 2),
  ('2b3f746c-110d-538f-afe3-00e60c27fd1f', 'silver', 'เทาเงิน', '#A7ADB5', 'METALLIC', 10000.00, 3),
  ('4e3c981d-1f87-5951-be1e-b774c3a25bed', 'pearl-white', 'ขาวมุก', '#F2F0E9', 'PEARL', 15000.00, 4),
  ('434793bc-f91b-5c5b-9b1d-9ff30a925097', 'blue', 'น้ำเงิน', '#2F5488', 'METALLIC', 10000.00, 5),
  ('34dac5ef-ec6f-571f-b201-8a74c98f6091', 'sport-red', 'แดงสปอร์ต', '#C8102E', 'SPECIAL', 25000.00, 6)
ON DUPLICATE KEY UPDATE id = id;

-- wheels
INSERT INTO wheel_options (id, code, name, size_inch, sort_order) VALUES
  ('5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 'w16-steel', '16" กระทะมาตรฐาน', 16, 1),
  ('6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 'w17-alloy', '17" ล้อแม็กซ์', 17, 2),
  ('f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 'w18-sport', '18" สปอร์ต สีเทาเข้ม', 18, 3),
  ('cbbb3669-ab54-5dc8-b01c-bfe32ba9a254', 'w19-forged', '19" ฟอร์จ สีดำ', 19, 4)
ON DUPLICATE KEY UPDATE id = id;

-- models (brand TOYOTY, shown in the shop)
INSERT INTO car_models (id, slug, brand, model_name, body_type, description, tag, featured, variant, engine, horsepower, transmission, drive, fuel, seats, location, warranty, features, color_options, is_active, weekly_capacity) VALUES
  ('eaf1e70b-5de9-55a3-be7a-62ca9bdd7bab', 'e-san', 'TOYOTY', 'E-san', 'sedan', 'ซีดานขนาดกลางของ TOYOTY นั่งสบายทั้งคันสำหรับเดินทางไกล เลือกได้ตั้งแต่รุ่น Eco ประหยัดน้ำมันไปจนถึง High Performance เครื่องเทอร์โบ', 'ซีดาน', 1, 'Eco / Balanced / High Performance', '1.5 ลิตร ไฮบริด', 111, 'e-CVT', 'ขับเคลื่อนล้อหน้า', 'ไฮบริด / เบนซิน', 5, 'โชว์รูม TOYOTY กรุงเทพฯ', 'รับประกัน 5 ปี หรือ 150,000 กม.', '["ห้องโดยสารกว้าง 5 ที่นั่ง", "ท้ายรถจุสัมภาระ 470 ลิตร", "TOYOTY Safety Pack ทุกรุ่นย่อย", "สั่งผลิตตามสเปกที่เลือก"]', NULL, 1, 5),
  ('f1f99bf6-5f58-5775-963b-59ea709468cb', 'khon', 'TOYOTY', 'Khon', 'suv', 'SUV 5 ที่นั่งสำหรับครอบครัว ตำแหน่งนั่งสูง มองทางชัด ใช้งานได้ทั้งในเมืองและต่างจังหวัด', 'SUV', 1, 'Eco / Balanced / High Performance', '1.5 ลิตร ไฮบริด', 111, 'e-CVT', 'ขับเคลื่อนล้อหน้า', 'ไฮบริด / เบนซิน', 5, 'โชว์รูม TOYOTY กรุงเทพฯ', 'รับประกัน 5 ปี หรือ 150,000 กม.', '["ใต้ท้องสูง 200 มม.", "เบาะหลังพับแยก 60:40", "TOYOTY Safety Pack ทุกรุ่นย่อย", "สั่งผลิตตามสเปกที่เลือก"]', NULL, 1, 5),
  ('dda25f4b-44cf-5efc-9635-d1b51c6c6918', 'rushri', 'TOYOTY', 'RushRi', 'pickup', 'กระบะ 4 ประตู 5 ที่นั่ง ใช้งานหนักได้ บรรทุกได้ และนั่งสบายพอสำหรับพาครอบครัวเที่ยว', 'กระบะ 4 ประตู', 1, 'Eco / Balanced / High Performance', '2.4 ลิตร ดีเซลเทอร์โบ', 150, 'อัตโนมัติ 6 สปีด', 'ขับเคลื่อน 4 ล้อ', 'ดีเซล', 5, 'โชว์รูม TOYOTY กรุงเทพฯ', 'รับประกัน 5 ปี หรือ 150,000 กม.', '["บรรทุกได้ 1 ตัน", "ขับเคลื่อน 4 ล้อ มีเฟืองท้ายล็อก", "TOYOTY Safety Pack ทุกรุ่นย่อย", "สั่งผลิตตามสเปกที่เลือก"]', NULL, 1, 5),
  ('7a9f8be6-1a66-53d6-bcfe-5f87c0671677', 'iburaporn', 'TOYOTY', 'Iburaporn', 'suv', 'SUV คันใหญ่ 7 ที่นั่ง 3 แถว สำหรับครอบครัวใหญ่และทริปไกล แรงบิดสูง ลุยได้ทุกเส้นทาง', 'SUV 7 ที่นั่ง', 1, 'Eco / Balanced / High Performance', '2.4 ลิตร ดีเซลเทอร์โบ', 150, 'อัตโนมัติ 6 สปีด', 'ขับเคลื่อน 4 ล้อ', 'ดีเซล', 7, 'โชว์รูม TOYOTY กรุงเทพฯ', 'รับประกัน 5 ปี หรือ 150,000 กม.', '["ห้องโดยสาร 3 แถว 7 ที่นั่ง", "ขับเคลื่อน 4 ล้อ", "TOYOTY Safety Pack ทุกรุ่นย่อย", "สั่งผลิตตามสเปกที่เลือก"]', NULL, 1, 5)
ON DUPLICATE KEY UPDATE id = id;

-- trims (3 per model)
INSERT INTO car_trims (id, car_model_id, code, name, tagline, price, engine, horsepower, fuel_economy_kml, transmission, fuel, features, parts_lead_days, default_wheel_id, sort_order) VALUES
  ('41e5f599-0f3a-57e2-a7c9-fed2f78e0718', 'eaf1e70b-5de9-55a3-be7a-62ca9bdd7bab', 'ECO', 'Eco', 'ประหยัด ราคาเริ่มต้น', 1690000.00, '1.5 ลิตร ไฮบริด', 111, 25.0, 'e-CVT', 'ไฮบริด', '["ระบบเบรกฉุกเฉินอัตโนมัติ", "จอกลาง 8 นิ้ว รองรับ Apple CarPlay / Android Auto", "กล้องมองหลัง", "ไฟหน้า LED"]', 14, '5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 1),
  ('5d1c1180-a816-528f-9e58-699741ebff82', 'eaf1e70b-5de9-55a3-be7a-62ca9bdd7bab', 'BALANCED', 'Balanced', 'สมดุล อุปกรณ์ครบ', 1840000.00, '1.8 ลิตร ไฮบริด', 140, 21.0, 'e-CVT', 'ไฮบริด', '["ทุกอย่างในรุ่น Eco", "เบาะหนัง คนขับปรับไฟฟ้า", "Adaptive Cruise Control", "กล้องรอบคัน 360 องศา"]', 21, '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 2),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', 'eaf1e70b-5de9-55a3-be7a-62ca9bdd7bab', 'HIGH_PERFORMANCE', 'High Performance', 'แรง ช่วงล่างสปอร์ต', 2040000.00, '2.0 ลิตร เทอร์โบ', 245, 13.0, 'อัตโนมัติ 8 สปีด', 'เบนซิน', '["ทุกอย่างในรุ่น Balanced", "ช่วงล่างสปอร์ต ปรับความหนืดได้", "เบรกสปอร์ต 4 พอต", "ชุดแต่งรอบคันและเบาะสปอร์ต"]', 35, 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 3),
  ('983ba919-d6ee-55af-9f6f-76d95538992b', 'f1f99bf6-5f58-5775-963b-59ea709468cb', 'ECO', 'Eco', 'ประหยัด ราคาเริ่มต้น', 2060000.00, '1.5 ลิตร ไฮบริด', 111, 25.0, 'e-CVT', 'ไฮบริด', '["ระบบเบรกฉุกเฉินอัตโนมัติ", "จอกลาง 8 นิ้ว รองรับ Apple CarPlay / Android Auto", "กล้องมองหลัง", "ไฟหน้า LED"]', 14, '5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 1),
  ('dd97652c-90f5-5a6a-9d42-274a9ae2aba2', 'f1f99bf6-5f58-5775-963b-59ea709468cb', 'BALANCED', 'Balanced', 'สมดุล อุปกรณ์ครบ', 2210000.00, '1.8 ลิตร ไฮบริด', 140, 21.0, 'e-CVT', 'ไฮบริด', '["ทุกอย่างในรุ่น Eco", "เบาะหนัง คนขับปรับไฟฟ้า", "Adaptive Cruise Control", "กล้องรอบคัน 360 องศา"]', 21, '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 2),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', 'f1f99bf6-5f58-5775-963b-59ea709468cb', 'HIGH_PERFORMANCE', 'High Performance', 'แรง ช่วงล่างสปอร์ต', 2410000.00, '2.0 ลิตร เทอร์โบ', 245, 13.0, 'อัตโนมัติ 8 สปีด', 'เบนซิน', '["ทุกอย่างในรุ่น Balanced", "ช่วงล่างสปอร์ต ปรับความหนืดได้", "เบรกสปอร์ต 4 พอต", "ชุดแต่งรอบคันและเบาะสปอร์ต"]', 35, 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 3),
  ('047966c9-126a-5aa4-9464-dd24c45afdfe', 'dda25f4b-44cf-5efc-9635-d1b51c6c6918', 'ECO', 'Eco', 'ประหยัด ราคาเริ่มต้น', 2200000.00, '2.4 ลิตร ดีเซลเทอร์โบ', 150, 14.0, 'อัตโนมัติ 6 สปีด', 'ดีเซล', '["ระบบเบรกฉุกเฉินอัตโนมัติ", "จอกลาง 8 นิ้ว รองรับ Apple CarPlay / Android Auto", "กล้องมองหลัง", "ไฟหน้า LED"]', 14, '5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 1),
  ('3a73c003-7940-5c91-af78-5224ed5e9be1', 'dda25f4b-44cf-5efc-9635-d1b51c6c6918', 'BALANCED', 'Balanced', 'สมดุล อุปกรณ์ครบ', 2350000.00, '2.8 ลิตร ดีเซลเทอร์โบ', 204, 12.5, 'อัตโนมัติ 6 สปีด', 'ดีเซล', '["ทุกอย่างในรุ่น Eco", "เบาะหนัง คนขับปรับไฟฟ้า", "Adaptive Cruise Control", "กล้องรอบคัน 360 องศา"]', 21, '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 2),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', 'dda25f4b-44cf-5efc-9635-d1b51c6c6918', 'HIGH_PERFORMANCE', 'High Performance', 'แรง ช่วงล่างสปอร์ต', 2550000.00, '2.8 ลิตร ดีเซลเทอร์โบ (จูนสปอร์ต)', 224, 11.0, 'อัตโนมัติ 6 สปีด', 'ดีเซล', '["ทุกอย่างในรุ่น Balanced", "ช่วงล่างสปอร์ต ปรับความหนืดได้", "เบรกสปอร์ต 4 พอต", "ชุดแต่งรอบคันและเบาะสปอร์ต"]', 35, 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 3),
  ('84b286fd-34ee-5ad7-a04f-16c85746457c', '7a9f8be6-1a66-53d6-bcfe-5f87c0671677', 'ECO', 'Eco', 'ประหยัด ราคาเริ่มต้น', 2220000.00, '2.4 ลิตร ดีเซลเทอร์โบ', 150, 13.5, 'อัตโนมัติ 6 สปีด', 'ดีเซล', '["ระบบเบรกฉุกเฉินอัตโนมัติ", "จอกลาง 8 นิ้ว รองรับ Apple CarPlay / Android Auto", "กล้องมองหลัง", "ไฟหน้า LED"]', 14, '5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 1),
  ('3ab9942a-66ec-516c-aefa-e551b645459c', '7a9f8be6-1a66-53d6-bcfe-5f87c0671677', 'BALANCED', 'Balanced', 'สมดุล อุปกรณ์ครบ', 2370000.00, '2.8 ลิตร ดีเซลเทอร์โบ', 204, 12.0, 'อัตโนมัติ 6 สปีด', 'ดีเซล', '["ทุกอย่างในรุ่น Eco", "เบาะหนัง คนขับปรับไฟฟ้า", "Adaptive Cruise Control", "กล้องรอบคัน 360 องศา"]', 21, '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 2),
  ('038d4398-de78-59f2-94fc-826bebb7093a', '7a9f8be6-1a66-53d6-bcfe-5f87c0671677', 'HIGH_PERFORMANCE', 'High Performance', 'แรง ช่วงล่างสปอร์ต', 2570000.00, '2.8 ลิตร ดีเซลเทอร์โบ (จูนสปอร์ต)', 224, 10.5, 'อัตโนมัติ 6 สปีด', 'ดีเซล', '["ทุกอย่างในรุ่น Balanced", "ช่วงล่างสปอร์ต ปรับความหนืดได้", "เบรกสปอร์ต 4 พอต", "ชุดแต่งรอบคันและเบาะสปอร์ต"]', 35, 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 3)
ON DUPLICATE KEY UPDATE id = id;

-- colours each trim may have (blue: Balanced + High Performance, sport red: High Performance only)
INSERT INTO trim_colors (trim_id, color_id) VALUES
  ('41e5f599-0f3a-57e2-a7c9-fed2f78e0718', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('41e5f599-0f3a-57e2-a7c9-fed2f78e0718', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('41e5f599-0f3a-57e2-a7c9-fed2f78e0718', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('41e5f599-0f3a-57e2-a7c9-fed2f78e0718', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('5d1c1180-a816-528f-9e58-699741ebff82', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('5d1c1180-a816-528f-9e58-699741ebff82', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('5d1c1180-a816-528f-9e58-699741ebff82', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('5d1c1180-a816-528f-9e58-699741ebff82', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('5d1c1180-a816-528f-9e58-699741ebff82', '434793bc-f91b-5c5b-9b1d-9ff30a925097'),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', '434793bc-f91b-5c5b-9b1d-9ff30a925097'),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', '34dac5ef-ec6f-571f-b201-8a74c98f6091'),
  ('983ba919-d6ee-55af-9f6f-76d95538992b', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('983ba919-d6ee-55af-9f6f-76d95538992b', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('983ba919-d6ee-55af-9f6f-76d95538992b', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('983ba919-d6ee-55af-9f6f-76d95538992b', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('dd97652c-90f5-5a6a-9d42-274a9ae2aba2', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('dd97652c-90f5-5a6a-9d42-274a9ae2aba2', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('dd97652c-90f5-5a6a-9d42-274a9ae2aba2', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('dd97652c-90f5-5a6a-9d42-274a9ae2aba2', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('dd97652c-90f5-5a6a-9d42-274a9ae2aba2', '434793bc-f91b-5c5b-9b1d-9ff30a925097'),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', '434793bc-f91b-5c5b-9b1d-9ff30a925097'),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', '34dac5ef-ec6f-571f-b201-8a74c98f6091'),
  ('047966c9-126a-5aa4-9464-dd24c45afdfe', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('047966c9-126a-5aa4-9464-dd24c45afdfe', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('047966c9-126a-5aa4-9464-dd24c45afdfe', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('047966c9-126a-5aa4-9464-dd24c45afdfe', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('3a73c003-7940-5c91-af78-5224ed5e9be1', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('3a73c003-7940-5c91-af78-5224ed5e9be1', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('3a73c003-7940-5c91-af78-5224ed5e9be1', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('3a73c003-7940-5c91-af78-5224ed5e9be1', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('3a73c003-7940-5c91-af78-5224ed5e9be1', '434793bc-f91b-5c5b-9b1d-9ff30a925097'),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', '434793bc-f91b-5c5b-9b1d-9ff30a925097'),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', '34dac5ef-ec6f-571f-b201-8a74c98f6091'),
  ('84b286fd-34ee-5ad7-a04f-16c85746457c', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('84b286fd-34ee-5ad7-a04f-16c85746457c', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('84b286fd-34ee-5ad7-a04f-16c85746457c', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('84b286fd-34ee-5ad7-a04f-16c85746457c', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('3ab9942a-66ec-516c-aefa-e551b645459c', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('3ab9942a-66ec-516c-aefa-e551b645459c', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('3ab9942a-66ec-516c-aefa-e551b645459c', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('3ab9942a-66ec-516c-aefa-e551b645459c', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('3ab9942a-66ec-516c-aefa-e551b645459c', '434793bc-f91b-5c5b-9b1d-9ff30a925097'),
  ('038d4398-de78-59f2-94fc-826bebb7093a', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687'),
  ('038d4398-de78-59f2-94fc-826bebb7093a', '6ca6d56c-e6ae-5bb1-9e5b-b5cec18a0193'),
  ('038d4398-de78-59f2-94fc-826bebb7093a', '2b3f746c-110d-538f-afe3-00e60c27fd1f'),
  ('038d4398-de78-59f2-94fc-826bebb7093a', '4e3c981d-1f87-5951-be1e-b774c3a25bed'),
  ('038d4398-de78-59f2-94fc-826bebb7093a', '434793bc-f91b-5c5b-9b1d-9ff30a925097'),
  ('038d4398-de78-59f2-94fc-826bebb7093a', '34dac5ef-ec6f-571f-b201-8a74c98f6091')
ON DUPLICATE KEY UPDATE trim_id = trim_id;

-- wheels each trim may have, with the extra price for that trim
INSERT INTO trim_wheels (trim_id, wheel_id, price_extra) VALUES
  ('41e5f599-0f3a-57e2-a7c9-fed2f78e0718', '5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 0.00),
  ('41e5f599-0f3a-57e2-a7c9-fed2f78e0718', '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 15000.00),
  ('5d1c1180-a816-528f-9e58-699741ebff82', '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 0.00),
  ('5d1c1180-a816-528f-9e58-699741ebff82', 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 25000.00),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 0.00),
  ('86e7c8d9-e39a-53ce-a001-0e5abc01fb22', 'cbbb3669-ab54-5dc8-b01c-bfe32ba9a254', 45000.00),
  ('983ba919-d6ee-55af-9f6f-76d95538992b', '5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 0.00),
  ('983ba919-d6ee-55af-9f6f-76d95538992b', '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 15000.00),
  ('dd97652c-90f5-5a6a-9d42-274a9ae2aba2', '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 0.00),
  ('dd97652c-90f5-5a6a-9d42-274a9ae2aba2', 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 25000.00),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 0.00),
  ('c7f08719-5313-539a-b7f8-82c36fefc94d', 'cbbb3669-ab54-5dc8-b01c-bfe32ba9a254', 45000.00),
  ('047966c9-126a-5aa4-9464-dd24c45afdfe', '5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 0.00),
  ('047966c9-126a-5aa4-9464-dd24c45afdfe', '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 15000.00),
  ('3a73c003-7940-5c91-af78-5224ed5e9be1', '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 0.00),
  ('3a73c003-7940-5c91-af78-5224ed5e9be1', 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 25000.00),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 0.00),
  ('4985cd90-a78c-5d2f-81e7-0b412526126f', 'cbbb3669-ab54-5dc8-b01c-bfe32ba9a254', 45000.00),
  ('84b286fd-34ee-5ad7-a04f-16c85746457c', '5f0b0b13-72cb-505e-8312-3ee2d00c16c3', 0.00),
  ('84b286fd-34ee-5ad7-a04f-16c85746457c', '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 15000.00),
  ('3ab9942a-66ec-516c-aefa-e551b645459c', '6a4b2cdd-9ecd-5b3b-b31e-708346434d1f', 0.00),
  ('3ab9942a-66ec-516c-aefa-e551b645459c', 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 25000.00),
  ('038d4398-de78-59f2-94fc-826bebb7093a', 'f09e0a9e-1d4e-5b28-b5a7-fd42f14700a7', 0.00),
  ('038d4398-de78-59f2-94fc-826bebb7093a', 'cbbb3669-ab54-5dc8-b01c-bfe32ba9a254', 45000.00)
ON DUPLICATE KEY UPDATE trim_id = trim_id;

-- one showroom car per model: Eco, white, standard wheel. Not for sale to order; used for test drives.
INSERT INTO cars (id, car_model_id, vin, color, manufacture_year, price, status, trim_id, paint_color_id, wheel_id) VALUES
  ('9f1f6bf3-647a-5306-9be4-e2b25fdbc5a3', 'eaf1e70b-5de9-55a3-be7a-62ca9bdd7bab', 'TYTOSHOWROOM00001', 'ขาว', 2026, 1690000.00, 'AVAILABLE', '41e5f599-0f3a-57e2-a7c9-fed2f78e0718', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687', '5f0b0b13-72cb-505e-8312-3ee2d00c16c3'),
  ('47b1b147-fbe9-5435-851b-84fa450408e5', 'f1f99bf6-5f58-5775-963b-59ea709468cb', 'TYTOSHOWROOM00002', 'ขาว', 2026, 2060000.00, 'AVAILABLE', '983ba919-d6ee-55af-9f6f-76d95538992b', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687', '5f0b0b13-72cb-505e-8312-3ee2d00c16c3'),
  ('212f054c-e8c2-50e2-b4ca-b60245eba109', 'dda25f4b-44cf-5efc-9635-d1b51c6c6918', 'TYTOSHOWROOM00003', 'ขาว', 2026, 2200000.00, 'AVAILABLE', '047966c9-126a-5aa4-9464-dd24c45afdfe', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687', '5f0b0b13-72cb-505e-8312-3ee2d00c16c3'),
  ('9af7e2ef-7fd3-5bd6-8974-1d89c70ae2fe', '7a9f8be6-1a66-53d6-bcfe-5f87c0671677', 'TYTOSHOWROOM00004', 'ขาว', 2026, 2220000.00, 'AVAILABLE', '84b286fd-34ee-5ad7-a04f-16c85746457c', 'b640dd7e-ddc2-58ab-a488-0f7e2ac3f687', '5f0b0b13-72cb-505e-8312-3ee2d00c16c3')
ON DUPLICATE KEY UPDATE id = id;

-- photos (from the old seed: E-san = Camry, Khon = Corolla Cross, RushRi = Hilux Revo, Iburaporn = Fortuner)
INSERT INTO car_images (id, car_id, image_path, sort_order) VALUES
  ('329be85f-a4b8-560f-a671-1fab1d2989c5', '9f1f6bf3-647a-5306-9be4-e2b25fdbc5a3', 'https://pictures.dealer.com/m/mcgeetoyotascionofdudley/1234/74cc1ed118ff4301aa8a08279a5b4b14.jpg', 0),
  ('24791758-a8c9-5433-adf8-21b074b4d95a', '9f1f6bf3-647a-5306-9be4-e2b25fdbc5a3', 'https://citymagazine.b-cdn.net/wp-content/uploads/2024/08/2025_Camry_XSE_AWD_HeavyMetalBlackRoof_003-1400x933.webp', 1),
  ('0b5e4dcd-28d1-5799-9501-24fa6ffe608b', '47b1b147-fbe9-5435-851b-84fa450408e5', 'https://cdn.motor1.com/images/mgl/QebKn8/s1/toyota-corolla-cross-2025-la-prova-su-strada.jpg', 0),
  ('70f2da17-ba9a-591c-b27b-9c7d954c064e', '47b1b147-fbe9-5435-851b-84fa450408e5', 'https://eurotarget.com/foto/Regole/20/5168/4_800x0.jpg', 1),
  ('50f02bce-8a7f-5a5a-b9db-75fe0f553eff', '212f054c-e8c2-50e2-b4ca-b60245eba109', 'https://img.kaidee.com/prd/20260623/371433590/m/19c50fc9-4683-49b9-b501-808b9c8716fd.jpg', 0),
  ('5227e6ff-8b2a-50ee-a627-2a792645a5c2', '212f054c-e8c2-50e2-b4ca-b60245eba109', 'https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg', 1),
  ('d1ede221-b5d1-5bef-bca4-a33e9e25d779', '9af7e2ef-7fd3-5bd6-8974-1d89c70ae2fe', 'https://carprices.ae/uploads/api_uploads_img_car_gallery_2023_toyota_fortuner_4_0l_vxr_3_4a0c66dd4b.jpg', 0),
  ('b2fe9ea9-37cd-5ce5-a065-d9fbb5b9a7cf', '9af7e2ef-7fd3-5bd6-8974-1d89c70ae2fe', 'https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg', 1)
ON DUPLICATE KEY UPDATE id = id;

SELECT m.slug, m.model_name, COUNT(DISTINCT t.id) AS trims, MIN(t.price) AS from_price, MAX(t.price) AS to_price
FROM car_models m JOIN car_trims t ON t.car_model_id = m.id
WHERE m.brand = 'TOYOTY' GROUP BY m.id, m.slug, m.model_name ORDER BY from_price;
