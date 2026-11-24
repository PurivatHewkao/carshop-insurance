/**
 * Catalog demo data and labels. The pages read cars and promotions from the
 * catalog API; SEED_CARS is only a fallback copy of the 4 TOYOTY models.
 * Prices, specifications, stock and promotions are demonstration values.
 */
export const CARS_STORAGE_KEY = 'carshop.catalog.cars.v1';
export const PROMOTIONS_STORAGE_KEY = 'carshop.catalog.promotions.v1';

// Types that can be chosen for a car (TOYOTY sells sedans, SUVs and pickups only).
// CATEGORY_LABELS below still names the old types so hidden models keep a readable label.
export const CAR_TYPES = ['sedan', 'suv', 'pickup'];

export const CATEGORY_LABELS = {
  sedan: 'ซีดาน',
  hatch: 'แฮทช์แบ็ก',
  suv: 'SUV / ครอสโอเวอร์',
  pickup: 'กระบะ',
  sport: 'สปอร์ต',
  supercar: 'ซูเปอร์คาร์',
  ev: 'รถยนต์ไฟฟ้า',
};

// Fallback copy of the 4 TOYOTY models (services/catalog/database/08_seed_toyoty.sql).
// The pages read cars from the catalog API; prices here are the Eco ("from") price.
const TOYOTY_FEATURES = ['TOYOTY Safety Pack ทุกรุ่นย่อย', 'สั่งผลิตตามสเปกที่เลือก'];

export const SEED_CARS = [
  {
    id: 'e-san', brand: 'TOYOTY', name: 'E-san', type: 'sedan', tag: 'ซีดาน',
    price: 1690000, fromPrice: 1690000, configurable: true, year: 2026, color: '#F4F4F2',
    imageUrl: 'https://pictures.dealer.com/m/mcgeetoyotascionofdudley/1234/74cc1ed118ff4301aa8a08279a5b4b14.jpg',
    variant: 'Eco / Balanced / High Performance', engine: '1.5 ลิตร ไฮบริด', horsepower: 111,
    transmission: 'e-CVT', drive: 'ขับเคลื่อนล้อหน้า', fuel: 'ไฮบริด / เบนซิน', seats: 5,
    stock: 1, location: 'โชว์รูม TOYOTY กรุงเทพฯ', warranty: 'รับประกัน 5 ปี หรือ 150,000 กม.',
    description: 'ซีดานขนาดกลางของ TOYOTY นั่งสบายทั้งคันสำหรับเดินทางไกล เลือกได้ตั้งแต่รุ่น Eco ประหยัดน้ำมันไปจนถึง High Performance เครื่องเทอร์โบ',
    features: ['ห้องโดยสารกว้าง 5 ที่นั่ง', 'ท้ายรถจุสัมภาระ 470 ลิตร', ...TOYOTY_FEATURES],
    gallery: ['https://citymagazine.b-cdn.net/wp-content/uploads/2024/08/2025_Camry_XSE_AWD_HeavyMetalBlackRoof_003-1400x933.webp'],
    featured: true,
  },
  {
    id: 'khon', brand: 'TOYOTY', name: 'Khon', type: 'suv', tag: 'SUV',
    price: 2060000, fromPrice: 2060000, configurable: true, year: 2026, color: '#F4F4F2',
    imageUrl: 'https://cdn.motor1.com/images/mgl/QebKn8/s1/toyota-corolla-cross-2025-la-prova-su-strada.jpg',
    variant: 'Eco / Balanced / High Performance', engine: '1.5 ลิตร ไฮบริด', horsepower: 111,
    transmission: 'e-CVT', drive: 'ขับเคลื่อนล้อหน้า', fuel: 'ไฮบริด / เบนซิน', seats: 5,
    stock: 1, location: 'โชว์รูม TOYOTY กรุงเทพฯ', warranty: 'รับประกัน 5 ปี หรือ 150,000 กม.',
    description: 'SUV 5 ที่นั่งสำหรับครอบครัว ตำแหน่งนั่งสูง มองทางชัด ใช้งานได้ทั้งในเมืองและต่างจังหวัด',
    features: ['ใต้ท้องสูง 200 มม.', 'เบาะหลังพับแยก 60:40', ...TOYOTY_FEATURES],
    gallery: ['https://eurotarget.com/foto/Regole/20/5168/4_800x0.jpg'],
    featured: true,
  },
  {
    id: 'rushri', brand: 'TOYOTY', name: 'RushRi', type: 'pickup', tag: 'กระบะ 4 ประตู',
    price: 2200000, fromPrice: 2200000, configurable: true, year: 2026, color: '#F4F4F2',
    imageUrl: 'https://img.kaidee.com/prd/20260623/371433590/m/19c50fc9-4683-49b9-b501-808b9c8716fd.jpg',
    variant: 'Eco / Balanced / High Performance', engine: '2.4 ลิตร ดีเซลเทอร์โบ', horsepower: 150,
    transmission: 'อัตโนมัติ 6 สปีด', drive: 'ขับเคลื่อน 4 ล้อ', fuel: 'ดีเซล', seats: 5,
    stock: 1, location: 'โชว์รูม TOYOTY กรุงเทพฯ', warranty: 'รับประกัน 5 ปี หรือ 150,000 กม.',
    description: 'กระบะ 4 ประตู 5 ที่นั่ง ใช้งานหนักได้ บรรทุกได้ และนั่งสบายพอสำหรับพาครอบครัวเที่ยว',
    features: ['บรรทุกได้ 1 ตัน', 'ขับเคลื่อน 4 ล้อ มีเฟืองท้ายล็อก', ...TOYOTY_FEATURES],
    gallery: ['https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg'],
    featured: true,
  },
  {
    id: 'iburaporn', brand: 'TOYOTY', name: 'Iburaporn', type: 'suv', tag: 'SUV 7 ที่นั่ง',
    price: 2220000, fromPrice: 2220000, configurable: true, year: 2026, color: '#F4F4F2',
    imageUrl: 'https://carprices.ae/uploads/api_uploads_img_car_gallery_2023_toyota_fortuner_4_0l_vxr_3_4a0c66dd4b.jpg',
    variant: 'Eco / Balanced / High Performance', engine: '2.4 ลิตร ดีเซลเทอร์โบ', horsepower: 150,
    transmission: 'อัตโนมัติ 6 สปีด', drive: 'ขับเคลื่อน 4 ล้อ', fuel: 'ดีเซล', seats: 7,
    stock: 1, location: 'โชว์รูม TOYOTY กรุงเทพฯ', warranty: 'รับประกัน 5 ปี หรือ 150,000 กม.',
    description: 'SUV คันใหญ่ 7 ที่นั่ง 3 แถว สำหรับครอบครัวใหญ่และทริปไกล แรงบิดสูง ลุยได้ทุกเส้นทาง',
    features: ['ห้องโดยสาร 3 แถว 7 ที่นั่ง', 'ขับเคลื่อน 4 ล้อ', ...TOYOTY_FEATURES],
    gallery: ['https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg'],
    featured: true,
  },
];

// Trim, paint finish and production labels shared by the configurator and stock pages.
export const TRIM_LABELS = {
  ECO: 'Eco',
  BALANCED: 'Balanced',
  HIGH_PERFORMANCE: 'High Performance',
};

export const FINISH_LABELS = {
  SOLID: 'สีพื้น',
  METALLIC: 'เมทัลลิก',
  PEARL: 'มุก',
  SPECIAL: 'สีพิเศษ',
};

export const PRODUCTION_STEPS = [
  { code: 'QUOTED', label: 'รอยืนยัน', hint: 'ส่งคำขอแล้ว รออนุมัติ + เงินจอง' },
  { code: 'SCHEDULED', label: 'จองคิวผลิต', hint: 'ได้สัปดาห์ผลิตแล้ว' },
  { code: 'IN_PRODUCTION', label: 'กำลังผลิต', hint: 'ได้ VIN จริง' },
  { code: 'IN_TRANSIT', label: 'กำลังขนส่ง', hint: 'ผ่าน QC ออกจากโรงงาน' },
  { code: 'READY', label: 'ถึงศูนย์', hint: 'พร้อมนัดรับรถ' },
  { code: 'DELIVERED', label: 'ส่งมอบแล้ว', hint: 'ลูกค้ารับรถแล้ว' },
];

export function productionLabel(code) {
  return PRODUCTION_STEPS.find((step) => step.code === code)?.label || code || '—';
}

/** '2027-01-25' → '25 ม.ค. 2570' */
export function formatThaiDate(day, { year = true } = {}) {
  if (!day) return '—';
  return new Date(day + 'T00:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    ...(year ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/** { from, to } → '25 ม.ค. – 1 ก.พ. 2570' (one date when both are the same day) */
export function formatDateRange(range) {
  if (!range?.from) return '—';
  if (range.from === range.to) return formatThaiDate(range.from);
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  return `${formatThaiDate(range.from, { year: !sameYear })} – ${formatThaiDate(range.to)}`;
}

const COLOR_OPTIONS_BY_TYPE = {
  sedan: [
    { name: 'ดำ', value: '#202126' },
    { name: 'ขาวมุก', value: '#F2F0E9' },
    { name: 'เทาเงิน', value: '#A7ADB5' },
    { name: 'แดง', value: '#C8102E' },
    { name: 'น้ำเงิน', value: '#32547D' },
  ],
  hatch: [
    { name: 'ขาวมุก', value: '#F2F0E9' },
    { name: 'แดง', value: '#C8102E' },
    { name: 'น้ำเงินเทา', value: '#526879' },
    { name: 'ดำ', value: '#202126' },
  ],
  suv: [
    { name: 'ขาวมุก', value: '#F2F0E9' },
    { name: 'ดำ', value: '#202126' },
    { name: 'เทาเงิน', value: '#A7ADB5' },
    { name: 'แดง', value: '#C8102E' },
  ],
  pickup: [
    { name: 'ขาว', value: '#F2F0E9' },
    { name: 'เทาเข้ม', value: '#454A51' },
    { name: 'ดำ', value: '#202126' },
    { name: 'แดง', value: '#C8102E' },
  ],
  sport: [
    { name: 'น้ำเงิน', value: '#2867B5' },
    { name: 'แดง', value: '#C8102E' },
    { name: 'ขาวมุก', value: '#F2F0E9' },
    { name: 'ดำ', value: '#202126' },
    { name: 'เทาเงิน', value: '#969CA5' },
  ],
  supercar: [
    { name: 'แดง', value: '#C8102E' },
    { name: 'เหลือง', value: '#EACB20' },
    { name: 'ส้ม', value: '#F07821' },
    { name: 'ดำ', value: '#202126' },
    { name: 'ขาวมุก', value: '#F2F0E9' },
  ],
  ev: [
    { name: 'น้ำเงิน', value: '#2B5A92' },
    { name: 'ฟ้าเงิน', value: '#AFC3D8' },
    { name: 'ขาวมุก', value: '#F2F0E9' },
    { name: 'ดำ', value: '#202126' },
  ],
};

const COLOR_OPTIONS_BY_ID = {
  'yaris-ativ': [
    { name: 'เทาเข้ม', value: '#414852', images: ['https://toyotavorachakyont.com/image/model/YARIS%20ATIV/line-up/HEV%20Premium_HEV_Premium_Urban_Metal.webp'] },
    { name: 'ดำ', value: '#202126', images: ['https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/2025_Toyota_Yaris_ATIV_HEV_Premium_%282%29.jpg/1280px-2025_Toyota_Yaris_ATIV_HEV_Premium_%282%29.jpg'] },
    { name: 'เทาเงิน', value: '#A7ADB5' },
    { name: 'ขาวมุก', value: '#F2F0E9' },
    { name: 'แดง', value: '#C8102E' },
  ],
  'yaris': [
    { name: 'ขาวมุก', value: '#F2F0E9', images: ['https://www.toyota.co.th/media/product/series/colors/v/yaris/39/ab4de76e4836b11a50307970c6a611383964227ca48bd4152739fcea999aac60.webp'] },
    { name: 'แดง', value: '#C8102E', images: ['https://www.toyotabkk.com/wp-content/uploads/2023/03/062b6d5a3868c67b842bc77a78dacadd45e330d4b7516711e9cdd92158bf00f0.webp'] },
    { name: 'น้ำเงินเทา', value: '#526879', images: ['https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Toyota_Yaris_Z_URBANO_%28XP210%2C_2024_facelift%29_%28front_three-quarter_view%29_in_Osaka%2C_Japan.jpg/960px-Toyota_Yaris_Z_URBANO_%28XP210%2C_2024_facelift%29_%28front_three-quarter_view%29_in_Osaka%2C_Japan.jpg'] },
    { name: 'ดำ', value: '#202126' },
  ],
  'corolla-altis-hybrid': [
    { name: 'ดำ', value: '#202126', images: ['https://www.toyota.co.th/media/product/series/colors/v/altis/19/aba25a93e98308b47fceb7f134b51e9de57e88c9255509ef119352f5923de2a1.webp'] },
    { name: 'เงิน', value: '#A7ADB5', images: ['https://assets.brandinside.asia/uploads/2019/09/PRimg-20190904075113.jpg'] },
    { name: 'ขาวมุก', value: '#F2F0E9' },
    { name: 'แดง', value: '#C8102E' },
  ],
  'ferrari-296-gtb': [
    { name: 'แดง', value: '#C8102E', images: ['https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_1_2560x1440.jpg', 'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_2_2560x1440.jpg', 'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_3_2560x1440.jpg'] },
    { name: 'ดำ', value: '#202126' },
    { name: 'เหลือง', value: '#EACB20' },
    { name: 'ขาวมุก', value: '#F2F0E9' },
  ],
  'lamborghini-huracan': [
    { name: 'ส้ม', value: '#F07821', images: ['https://www.planetcarsz.com/assets/uploads/2019/03/LAMBORGHINI%20HURACAN%20EVO%202019%200007.jpg'] },
    { name: 'เหลือง', value: '#EACB20', images: ['https://s1.cdn.autoevolution.com/images/news/gallery/watch-this-lamborghini-huracan-drift-donut-crash-into-barrier-then-catch-fire_15.jpg'] },
    { name: 'ดำ', value: '#202126' },
    { name: 'ขาวมุก', value: '#F2F0E9' },
  ],
  'nissan-gt-r': [
    { name: 'น้ำเงิน', value: '#2867B5', images: ['https://www.autoblog.com/.image/MjA5MTc4Mjc4NjIzNzgyNzU2/2012%20Nissan%20GT-R.jpg?profile=w1536&x=50&y=50'] },
    { name: 'เทาเงิน', value: '#969CA5' },
    { name: 'ดำ', value: '#202126' },
    { name: 'ขาวมุก', value: '#F2F0E9' },
  ],
  'byd-seal': [
    { name: 'น้ำเงิน', value: '#2B5A92', images: ['https://asset.carwyapar.com/Car%20Images/BYD/Seal/BYD-Seal-Premium/sidefront.webp'] },
    { name: 'ฟ้าเงิน', value: '#AFC3D8', images: ['https://www.bratislavak.sk/assets/images/ba/articles/img-inline/byd-20260423033116.webp'] },
    { name: 'ขาวมุก', value: '#F2F0E9' },
    { name: 'ดำ', value: '#202126' },
  ],
};

export function getCarColorOptions(car) {
  if (Array.isArray(car?.colorOptions) && car.colorOptions.length) return car.colorOptions;
  if (!car) return COLOR_OPTIONS_BY_TYPE.sedan;
  const options = COLOR_OPTIONS_BY_ID[car.id] || COLOR_OPTIONS_BY_TYPE[car.type] || COLOR_OPTIONS_BY_TYPE.sedan;
  const hasCurrentColor = options.some((option) => String(option.value).toLowerCase() === String(car.color || '').toLowerCase());
  return car.color && !hasCurrentColor
    ? [{ name: 'สีในภาพหลัก', value: car.color }, ...options]
    : options;
}

export const SEED_PROMOTIONS = [
  {
    id: 'trade-in-bonus', title: 'Trade-in Bonus', subtitle: 'นำรถเก่ามาแลกรถใหม่',
    badge: 'ข้อเสนอแนะนำ', value: 'โบนัสเพิ่มสูงสุด ฿80,000',
    description: 'รับสิทธิประเมินรถคันเดิมและนำมูลค่าไปใช้เป็นส่วนลดรถคันใหม่ เหมาะกับลูกค้าที่ต้องการเปลี่ยนรถ',
    conditions: 'ขึ้นกับสภาพรถ รุ่นรถ และผลการประเมินจากผู้จำหน่าย',
    appliesTo: 'รถทุกรุ่น', endDate: '2026-12-31', active: true,
  },
  {
    id: 'premium-care', title: 'Premium Care Package', subtitle: 'แพ็กเกจดูแลรถสำหรับรถใหม่',
    badge: 'ยอดนิยม', value: 'ฟรีค่าบำรุงรักษาตามแพ็กเกจ',
    description: 'ข้อเสนอแพ็กเกจดูแลหลังการขายสำหรับรถที่ร่วมรายการ เพิ่มความอุ่นใจในช่วงเริ่มต้นใช้งาน',
    conditions: 'รายการตรวจเช็กและระยะเวลารับสิทธิ์เป็นไปตามเงื่อนไขแคมเปญ',
    appliesTo: 'รถยนต์นั่งและ SUV ที่ร่วมรายการ', endDate: '2026-12-31', active: true,
  },
  {
    id: 'hybrid-smart', title: 'Hybrid Smart Deal', subtitle: 'ข้อเสนอสำหรับรถไฮบริด',
    badge: 'Hybrid', value: 'รับสิทธิพิเศษเมื่อจองรถไฮบริด',
    description: 'แนะนำสำหรับ Corolla Altis Hybrid, Corolla Cross Hybrid, Yaris Cross HEV และรุ่นที่ร่วมรายการ',
    conditions: 'สิทธิประโยชน์และรุ่นที่ร่วมรายการต้องยืนยันกับผู้จำหน่ายก่อนทำสัญญา',
    appliesTo: 'รถไฮบริดที่ร่วมรายการ', endDate: '2026-11-30', active: true,
  },
  {
    id: 'supercar-experience', title: 'Supercar Privilege', subtitle: 'ประสบการณ์สำหรับรถสปอร์ตและซูเปอร์คาร์',
    badge: 'Premium', value: 'บริการส่งมอบรถแบบพิเศษ',
    description: 'จัดเตรียมประสบการณ์ส่งมอบรถและคำแนะนำการใช้งานส่วนบุคคลสำหรับรถสปอร์ตและซูเปอร์คาร์',
    conditions: 'ต้องจองนัดหมายล่วงหน้าและขึ้นกับรุ่นรถที่จำหน่าย',
    appliesTo: 'รถสปอร์ตและซูเปอร์คาร์', endDate: '2026-12-31', active: true,
  },
  {
    id: 'test-drive-gift', title: 'Weekend Test Drive', subtitle: 'นัดทดลองขับในวันหยุด',
    badge: 'กิจกรรม', value: 'รับของที่ระลึกเมื่อร่วมกิจกรรม',
    description: 'ชวนทดลองนั่งและทดลองขับรถรุ่นที่สนใจ พร้อมรับคำแนะนำเปรียบเทียบรุ่นรถจากทีมขาย',
    conditions: 'ต้องลงทะเบียนและยืนยันคิวทดลองขับล่วงหน้า ของที่ระลึกมีจำนวนจำกัด',
    appliesTo: 'รถรุ่นที่เปิดทดลองขับ', endDate: '2026-12-31', active: true,
  },
];

function safeRead(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function getCars() {
  const stored = safeRead(CARS_STORAGE_KEY, null);
  const cars = Array.isArray(stored) ? stored : SEED_CARS;
  return cars.map((car) => {
    const seed = SEED_CARS.find((item) => item.id === car.id);
    const merged = {
      ...(seed || {}),
      ...car,
      // Keep uploaded local photos, but refresh demo seed URLs for vehicles that
      // were already saved in LocalStorage before the real-photo update.
      imageUrl: String(car.imageUrl || '').startsWith('data:')
        ? car.imageUrl
        : (seed?.imageUrl || car.imageUrl || ''),
      gallery: [...(Array.isArray(car.gallery) ? car.gallery : []), ...(seed?.gallery || [])]
        .filter((url, index, all) => Boolean(url) && url !== (car.imageUrl || seed?.imageUrl) && all.indexOf(url) === index)
        .slice(0, 5),
    };
    merged.colorOptions = getCarColorOptions(merged);
    return merged;
  });
}

export function saveCars(cars) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(CARS_STORAGE_KEY, JSON.stringify(cars));
    return true;
  } catch {
    return false;
  }
}

export function getPromotions() {
  return safeRead(PROMOTIONS_STORAGE_KEY, SEED_PROMOTIONS);
}

export function savePromotions(promotions) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(promotions));
    return true;
  } catch {
    return false;
  }
}

export function formatBaht(value) {
  return `฿${Number(value || 0).toLocaleString('th-TH')}`;
}

export function parseBaht(value) {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

export function stockStatus(stock) {
  if (Number(stock) <= 0) return { label: 'หมดสต็อก', tone: 'out' };
  if (Number(stock) <= 2) return { label: 'เหลือน้อย', tone: 'low' };
  return { label: 'พร้อมจำหน่าย', tone: 'in' };
}
