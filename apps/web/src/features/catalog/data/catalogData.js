/**
 * Catalog demo data for the frontend-only prototype.
 * Prices, specifications, stock and promotions are demonstration values and
 * must be reviewed before connecting a real catalog API.
 */
export const CARS_STORAGE_KEY = 'carshop.catalog.cars.v1';
export const PROMOTIONS_STORAGE_KEY = 'carshop.catalog.promotions.v1';

export const CATEGORY_LABELS = {
  sedan: 'ซีดาน',
  hatch: 'แฮทช์แบ็ก',
  suv: 'SUV / ครอสโอเวอร์',
  pickup: 'กระบะ',
  sport: 'สปอร์ต',
  supercar: 'ซูเปอร์คาร์',
  ev: 'รถยนต์ไฟฟ้า',
};

export const SEED_CARS = [
  {
    id: 'yaris-ativ', brand: 'Toyota', name: 'Yaris Ativ', type: 'sedan', tag: 'ยอดนิยม',
    price: 569000, year: 2025, color: '#414852', imageUrl: '',
    variant: 'Premium Luxury', engine: '1.2 ลิตร เบนซิน', horsepower: 94,
    transmission: 'อัตโนมัติ CVT', drive: 'ขับเคลื่อนล้อหน้า', fuel: 'เบนซิน', seats: 5,
    stock: 8, location: 'โชว์รูมกรุงเทพฯ', warranty: 'รับประกันตามเงื่อนไขผู้ผลิต',
    description: 'ซีดานขนาดกะทัดรัดสำหรับใช้งานในเมือง คล่องตัว ประหยัดพื้นที่จอด และมีอุปกรณ์อำนวยความสะดวกสำหรับการเดินทางทุกวัน',
    features: ['ระบบความปลอดภัยพื้นฐาน', 'จอสัมผัสเชื่อมต่อสมาร์ตโฟน', 'กล้องมองหลัง', 'ห้องโดยสาร 5 ที่นั่ง'],
    gallery: [], featured: true,
  },
  {
    id: 'yaris', brand: 'Toyota', name: 'Yaris', type: 'hatch', tag: 'พร้อมส่ง',
    price: 584000, year: 2025, color: '#F2F0E9', imageUrl: '',
    variant: 'Sport Premium', engine: '1.2 ลิตร เบนซิน', horsepower: 92,
    transmission: 'อัตโนมัติ CVT', drive: 'ขับเคลื่อนล้อหน้า', fuel: 'เบนซิน', seats: 5,
    stock: 5, location: 'โชว์รูมกรุงเทพฯ', warranty: 'รับประกันตามเงื่อนไขผู้ผลิต',
    description: 'แฮทช์แบ็กสำหรับชีวิตประจำวัน ขนาดกะทัดรัด จอดง่าย และจัดพื้นที่ห้องโดยสารให้ใช้งานได้หลากหลาย',
    features: ['ตัวถัง 5 ประตู', 'เบาะหลังพับเพิ่มพื้นที่เก็บของ', 'ระบบเชื่อมต่อโทรศัพท์', 'ระบบช่วยขับขี่'],
    gallery: [], featured: false,
  },
  {
    id: 'corolla-altis-hybrid', brand: 'Toyota', name: 'Corolla Altis Hybrid', type: 'sedan', tag: 'ไฮบริด',
    price: 909000, year: 2025, color: '#202126', imageUrl: '',
    variant: 'Hybrid Premium', engine: '1.8 ลิตร เบนซิน + มอเตอร์ไฟฟ้า', horsepower: 122,
    transmission: 'e-CVT', drive: 'ขับเคลื่อนล้อหน้า', fuel: 'ไฮบริด', seats: 5,
    stock: 4, location: 'โชว์รูมกรุงเทพฯ', warranty: 'รับประกันตามเงื่อนไขผู้ผลิต',
    description: 'ซีดานไฮบริดสำหรับผู้ที่ต้องการความนุ่มนวลและความประหยัดในการเดินทางทั้งในเมืองและนอกเมือง',
    features: ['ระบบขับเคลื่อนไฮบริด', 'ระบบช่วยเหลือผู้ขับขี่', 'เบาะนั่ง 5 ที่นั่ง', 'พื้นที่เก็บสัมภาระท้ายรถ'],
    gallery: [], featured: true,
  },
  {
    id: 'camry', brand: 'Toyota', name: 'Camry', type: 'sedan', tag: 'พรีเมียม',
    price: 1589000, year: 2025, color: '#E8E8E4',
    imageUrl: 'https://pictures.dealer.com/m/mcgeetoyotascionofdudley/1234/74cc1ed118ff4301aa8a08279a5b4b14.jpg',
    variant: 'HEV Premium Luxury', engine: '2.5 ลิตร เบนซิน + มอเตอร์ไฟฟ้า', horsepower: 230,
    transmission: 'e-CVT', drive: 'ขับเคลื่อนล้อหน้า', fuel: 'ไฮบริด', seats: 5,
    stock: 2, location: 'โชว์รูมกรุงเทพฯ', warranty: 'รับประกันตามเงื่อนไขผู้ผลิต',
    description: 'ซีดานระดับพรีเมียมที่เน้นความสบายของผู้โดยสาร พื้นที่ห้องโดยสารกว้าง และระบบขับเคลื่อนที่ตอบโจทย์การเดินทางไกล',
    features: ['ห้องโดยสารระดับพรีเมียม', 'ระบบไฮบริด', 'ระบบช่วยเหลือการขับขี่', 'เบาะนั่งปรับไฟฟ้าในรุ่นที่กำหนด'],
    gallery: [], featured: false,
  },
  {
    id: 'corolla-cross', brand: 'Toyota', name: 'Corolla Cross Hybrid', type: 'suv', tag: 'ไฮบริด',
    price: 889000, year: 2025, color: '#B8BBC2',
    imageUrl: 'https://cdn.motor1.com/images/mgl/QebKn8/s1/toyota-corolla-cross-2025-la-prova-su-strada.jpg',
    variant: 'Hybrid Smart', engine: '1.8 ลิตร เบนซิน + มอเตอร์ไฟฟ้า', horsepower: 122,
    transmission: 'e-CVT', drive: 'ขับเคลื่อนล้อหน้า', fuel: 'ไฮบริด', seats: 5,
    stock: 6, location: 'โชว์รูมกรุงเทพฯ', warranty: 'รับประกันตามเงื่อนไขผู้ผลิต',
    description: 'SUV ครอบครัวขนาดกะทัดรัด ช่วงล่างสำหรับการใช้งานประจำวัน ห้องโดยสารกว้าง และทัศนวิสัยการขับขี่ที่ดี',
    features: ['ระบบไฮบริด', 'พื้นที่เก็บสัมภาระท้ายรถ', 'ระบบความปลอดภัย Toyota Safety Sense ในรุ่นที่กำหนด', 'เบาะนั่ง 5 ที่นั่ง'],
    gallery: [], featured: true,
  },
  {
    id: 'yaris-cross', brand: 'Toyota', name: 'Yaris Cross HEV', type: 'suv', tag: 'พร้อมจอง',
    price: 799000, year: 2025, color: '#C8102E',
    imageUrl: 'https://drivetripper.com/userfiles2020/images/ALL-NEW-YARIS-CROSS-HEV-PREMIUM-LUXURY_05.jpg',
    variant: 'Premium Luxury', engine: '1.5 ลิตร เบนซิน + มอเตอร์ไฟฟ้า', horsepower: 111,
    transmission: 'e-CVT', drive: 'ขับเคลื่อนล้อหน้า', fuel: 'ไฮบริด', seats: 5,
    stock: 3, location: 'โชว์รูมกรุงเทพฯ', warranty: 'รับประกันตามเงื่อนไขผู้ผลิต',
    description: 'ครอสโอเวอร์ไฮบริดสำหรับคนเมือง ให้ตำแหน่งนั่งสูง พื้นที่เก็บของยืดหยุ่น และขนาดเหมาะกับการใช้งานทุกวัน',
    features: ['ระบบไฮบริด', 'ฝาท้ายเปิดใช้งานสะดวกในรุ่นที่กำหนด', 'ระบบช่วยขับขี่', 'เบาะนั่ง 5 ที่นั่ง'],
    gallery: [], featured: true,
  },
  {
    id: 'fortuner', brand: 'Toyota', name: 'Fortuner', type: 'suv', tag: 'พร้อมส่ง',
    price: 1349000, year: 2025, color: '#F2F0E9', imageUrl: '',
    variant: '2.4 Leader', engine: '2.4 ลิตร ดีเซลเทอร์โบ', horsepower: 150,
    transmission: 'อัตโนมัติ 6 สปีด', drive: 'ขับเคลื่อนล้อหลัง / 4 ล้อ ตามรุ่น', fuel: 'ดีเซล', seats: 7,
    stock: 2, location: 'โชว์รูมกรุงเทพฯ', warranty: 'รับประกันตามเงื่อนไขผู้ผลิต',
    description: 'SUV 7 ที่นั่งที่ออกแบบสำหรับครอบครัวและการเดินทางไกล มีพื้นที่โดยสารหลายแถวและตัวเลือกระบบขับเคลื่อนตามรุ่นย่อย',
    features: ['ห้องโดยสาร 7 ที่นั่ง', 'เครื่องยนต์ดีเซลเทอร์โบ', 'ตัวเลือกขับเคลื่อน 4 ล้อในบางรุ่น', 'พื้นที่เก็บสัมภาระปรับเปลี่ยนได้'],
    gallery: [], featured: false,
  },
  {
    id: 'hilux-revo', brand: 'Toyota', name: 'Hilux Revo', type: 'pickup', tag: 'พร้อมส่ง',
    price: 549000, year: 2025, color: '#E8E8E4',
    imageUrl: 'https://img.kaidee.com/prd/20260623/371433590/m/19c50fc9-4683-49b9-b501-808b9c8716fd.jpg',
    variant: '2.4 Standard Cab', engine: '2.4 ลิตร ดีเซลเทอร์โบ', horsepower: 150,
    transmission: 'ธรรมดา 6 สปีด', drive: 'ขับเคลื่อนล้อหลัง', fuel: 'ดีเซล', seats: 2,
    stock: 7, location: 'คลังรถปทุมธานี', warranty: 'รับประกันตามเงื่อนไขผู้ผลิต',
    description: 'รถกระบะสำหรับงานบรรทุกและการใช้งานเชิงพาณิชย์ เลือกรูปแบบห้องโดยสารและระบบขับเคลื่อนได้ตามความต้องการ',
    features: ['กระบะท้ายสำหรับบรรทุก', 'เครื่องยนต์ดีเซล', 'มีหลายรูปแบบตัวถัง', 'เหมาะกับงานธุรกิจและการเดินทาง'],
    gallery: [], featured: false,
  },
  {
    id: 'gr-supra', brand: 'Toyota', name: 'GR Supra', type: 'sport', tag: 'รถสปอร์ต',
    price: 5349000, year: 2025, color: '#D9E0E7',
    imageUrl: 'https://images.pistonheads.com/nimg/45612/10.jpg',
    variant: '3.0 Premium', engine: '3.0 ลิตร 6 สูบ เทอร์โบ', horsepower: 387,
    transmission: 'อัตโนมัติ 8 สปีด', drive: 'ขับเคลื่อนล้อหลัง', fuel: 'เบนซิน', seats: 2,
    stock: 1, location: 'โชว์รูมรถสปอร์ต', warranty: 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย',
    description: 'รถสปอร์ตสองที่นั่งที่เน้นสมรรถนะและการควบคุม เหมาะกับผู้ที่มองหารถขับสนุกพร้อมดีไซน์สปอร์ตชัดเจน',
    features: ['เครื่องยนต์ 6 สูบเทอร์โบ', 'ขับเคลื่อนล้อหลัง', 'ห้องโดยสาร 2 ที่นั่ง', 'ระบบช่วยควบคุมการทรงตัว'],
    gallery: [], featured: true,
  },
  {
    id: 'ferrari-296-gtb', brand: 'Ferrari', name: '296 GTB', type: 'supercar', tag: 'ซูเปอร์คาร์',
    price: 29900000, year: 2025, color: '#C8102E',
    imageUrl: 'https://cdn.motor1.com/images/mgl/OkpwL/s3/ferrari-296-gtb.jpg',
    variant: 'V6 Hybrid', engine: '3.0 ลิตร V6 Twin-Turbo + มอเตอร์ไฟฟ้า', horsepower: 830,
    transmission: 'DCT 8 สปีด', drive: 'ขับเคลื่อนล้อหลัง', fuel: 'Plug-in Hybrid', seats: 2,
    stock: 1, location: 'โชว์รูมรถพรีเมียม', warranty: 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย',
    description: 'ซูเปอร์คาร์เครื่องยนต์วางกลางที่ผสานเครื่องยนต์ V6 เทอร์โบกับระบบไฟฟ้า โดดเด่นด้านการตอบสนองและรูปทรงตามหลักอากาศพลศาสตร์',
    features: ['ระบบขับเคลื่อน Plug-in Hybrid', 'เครื่องยนต์ V6 Twin-Turbo', 'ห้องโดยสาร 2 ที่นั่ง', 'ตัวถังสปอร์ตวางเครื่องยนต์กลาง'],
    gallery: ['https://editorial.pxcrush.net/carsales/general/editorial/ferrari-296-gtb-02.jpg'], featured: true,
  },
  {
    id: 'lamborghini-huracan', brand: 'Lamborghini', name: 'Huracán EVO', type: 'supercar', tag: 'ซูเปอร์คาร์',
    price: 22500000, year: 2024, color: '#F07821',
    imageUrl: 'https://i.gaw.to/content/photos/14/55/145544_Lamborghini_Huracan_LP_610-4_premieres_photos_officielles.jpg',
    variant: 'EVO V10', engine: '5.2 ลิตร V10', horsepower: 640,
    transmission: 'DCT 7 สปีด', drive: 'ขับเคลื่อน 4 ล้อ ตามรุ่น', fuel: 'เบนซิน', seats: 2,
    stock: 0, location: 'สั่งรถตามคำขอ', warranty: 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย',
    description: 'ซูเปอร์คาร์เครื่องยนต์ V10 ที่เน้นเสียงเครื่องยนต์ คาแรกเตอร์สปอร์ต และการออกแบบที่โดดเด่น',
    features: ['เครื่องยนต์ V10', 'ตัวถังทรงสปอร์ต', 'ห้องโดยสาร 2 ที่นั่ง', 'ระบบควบคุมการขับขี่หลายโหมด'],
    gallery: ['https://immagini.alvolante.it/sites/default/files/styles/image_gallery_big/public/news_galleria/2013/12/lamborghini-huracan-spy_4.jpg'], featured: true,
  },
  {
    id: 'porsche-911-carrera', brand: 'Porsche', name: '911 Carrera', type: 'sport', tag: 'สปอร์ตพรีเมียม',
    price: 12900000, year: 2025, color: '#F0F0EC',
    imageUrl: 'https://car.go.th/api/v1/file/data?file_id=d499250bd7024467ae0129eddcbb4afc',
    variant: 'Carrera Coupe', engine: '3.0 ลิตร Flat-six Twin-Turbo', horsepower: 388,
    transmission: 'PDK 8 สปีด', drive: 'ขับเคลื่อนล้อหลัง', fuel: 'เบนซิน', seats: 4,
    stock: 1, location: 'โชว์รูมรถสปอร์ต', warranty: 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย',
    description: 'รถสปอร์ตที่ผสานสมรรถนะกับการใช้งานจริงในชีวิตประจำวัน มีพื้นที่นั่งแบบ 2+2 และรูปทรงอันเป็นเอกลักษณ์',
    features: ['เครื่องยนต์ Flat-six เทอร์โบ', 'เกียร์ PDK', 'รูปแบบเบาะ 2+2', 'ระบบช่วยเหลือการขับขี่'],
    gallery: [], featured: true,
  },
  {
    id: 'bmw-m4-competition', brand: 'BMW', name: 'M4 Competition', type: 'sport', tag: 'สปอร์ตพรีเมียม',
    price: 9999000, year: 2025, color: '#2867B5',
    imageUrl: 'https://img.autotrader.co.za/13953116',
    variant: 'Competition Coupé', engine: '3.0 ลิตร 6 สูบ Twin-Turbo', horsepower: 510,
    transmission: 'อัตโนมัติ 8 สปีด', drive: 'ขึ้นกับรุ่นย่อย', fuel: 'เบนซิน', seats: 4,
    stock: 2, location: 'โชว์รูมรถสปอร์ต', warranty: 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย',
    description: 'คูเป้สมรรถนะสูงที่ผสานกำลังเครื่องยนต์กับความสะดวกสบายในห้องโดยสาร เหมาะกับผู้ที่ต้องการรถสปอร์ตใช้ได้ทุกวัน',
    features: ['เครื่องยนต์ 6 สูบเทอร์โบ', 'ตัวถังคูเป้ 2 ประตู', 'โหมดการขับขี่หลายรูปแบบ', 'ห้องโดยสาร 4 ที่นั่ง'],
    gallery: [], featured: false,
  },
  {
    id: 'nissan-gt-r', brand: 'Nissan', name: 'GT-R Premium', type: 'sport', tag: 'สมรรถนะสูง',
    price: 12500000, year: 2024, color: '#2867B5', imageUrl: '',
    variant: 'Premium Edition', engine: '3.8 ลิตร V6 Twin-Turbo', horsepower: 565,
    transmission: 'DCT 6 สปีด', drive: 'ขับเคลื่อน 4 ล้อ', fuel: 'เบนซิน', seats: 4,
    stock: 0, location: 'สั่งรถตามคำขอ', warranty: 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย',
    description: 'รถสปอร์ตสมรรถนะสูงที่มีระบบขับเคลื่อนสี่ล้อและระบบควบคุมที่ออกแบบมาเพื่อการขับขี่แบบสปอร์ต',
    features: ['เครื่องยนต์ V6 Twin-Turbo', 'ระบบขับเคลื่อน 4 ล้อ', 'ห้องโดยสาร 2+2', 'ระบบควบคุมการทรงตัว'],
    gallery: [], featured: false,
  },
  {
    id: 'byd-seal', brand: 'BYD', name: 'SEAL Premium', type: 'ev', tag: 'รถยนต์ไฟฟ้า',
    price: 1299000, year: 2025, color: '#2B5A92', imageUrl: '',
    variant: 'Premium RWD', engine: 'มอเตอร์ไฟฟ้า', horsepower: 313,
    transmission: 'Single-speed', drive: 'ขับเคลื่อนล้อหลัง', fuel: 'ไฟฟ้า 100%', seats: 5,
    stock: 3, location: 'โชว์รูมรถไฟฟ้า', warranty: 'ตรวจสอบเงื่อนไขแบตเตอรี่และตัวรถก่อนซื้อ',
    description: 'รถยนต์ไฟฟ้าทรงซีดานที่เน้นการตอบสนองของมอเตอร์ ความเงียบในการขับขี่ และอุปกรณ์ภายในที่ทันสมัย',
    features: ['ขับเคลื่อนด้วยไฟฟ้า 100%', 'ระบบชาร์จไฟ', 'ระบบช่วยเหลือการขับขี่', 'ห้องโดยสาร 5 ที่นั่ง'],
    gallery: [], featured: false,
  },
];

// Real-car photographs used by the Frontend demo. Galleries contain exterior views,
// and color-specific sets are only offered where a matching photo is available.
const VEHICLE_PHOTO_UPDATES = {
  'yaris-ativ': {
    imageUrl: 'https://toyotavorachakyont.com/image/model/YARIS%20ATIV/line-up/HEV%20Premium_HEV_Premium_Urban_Metal.webp',
    gallery: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/2025_Toyota_Yaris_ATIV_HEV_Premium_%282%29.jpg/1280px-2025_Toyota_Yaris_ATIV_HEV_Premium_%282%29.jpg',
      'https://pgw.udn.com.tw/gw/photo.php?exp=3600&fw=930&nt=1&sh=0&sl=W&sw=0&u=https%3A%2F%2Fuc.udn.com.tw%2Fphoto%2F2022%2F08%2F09%2F0%2F18254127.jpg&x=0&y=0',
    ],
  },
  'yaris': {
    imageUrl: 'https://www.toyota.co.th/media/product/series/colors/v/yaris/39/ab4de76e4836b11a50307970c6a611383964227ca48bd4152739fcea999aac60.webp',
    gallery: [
      'https://www.toyotabkk.com/wp-content/uploads/2023/03/062b6d5a3868c67b842bc77a78dacadd45e330d4b7516711e9cdd92158bf00f0.webp',
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Toyota_Yaris_Z_URBANO_%28XP210%2C_2024_facelift%29_%28front_three-quarter_view%29_in_Osaka%2C_Japan.jpg/960px-Toyota_Yaris_Z_URBANO_%28XP210%2C_2024_facelift%29_%28front_three-quarter_view%29_in_Osaka%2C_Japan.jpg',
    ],
  },
  'corolla-altis-hybrid': {
    imageUrl: 'https://www.toyota.co.th/media/product/series/colors/v/altis/19/aba25a93e98308b47fceb7f134b51e9de57e88c9255509ef119352f5923de2a1.webp',
    gallery: ['https://assets.brandinside.asia/uploads/2019/09/PRimg-20190904075113.jpg'],
  },
  'camry': {
    gallery: ['https://citymagazine.b-cdn.net/wp-content/uploads/2024/08/2025_Camry_XSE_AWD_HeavyMetalBlackRoof_003-1400x933.webp'],
  },
  'corolla-cross': {
    gallery: ['https://eurotarget.com/foto/Regole/20/5168/4_800x0.jpg'],
  },
  'yaris-cross': {
    gallery: ['https://d1tjylbhswro2u.cloudfront.net/images/posts/2025/08/post27702_1.jpg'],
  },
  'fortuner': {
    imageUrl: 'https://carprices.ae/uploads/api_uploads_img_car_gallery_2023_toyota_fortuner_4_0l_vxr_3_4a0c66dd4b.jpg',
    gallery: ['https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg'],
  },
  'hilux-revo': {
    gallery: ['https://imgc2.taladrod.com/c/cidx/013/747/87_1.jpg'],
  },
  'gr-supra': {
    gallery: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=85'],
  },
  'ferrari-296-gtb': {
    gallery: [
      'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_1_2560x1440.jpg',
      'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_2_2560x1440.jpg',
      'https://images.caricos.com/f/ferrari/2022_ferrari_296_gtb/images/2560x1440/2022_ferrari_296_gtb_3_2560x1440.jpg',
    ],
  },
  'lamborghini-huracan': {
    imageUrl: 'https://www.planetcarsz.com/assets/uploads/2019/03/LAMBORGHINI%20HURACAN%20EVO%202019%200007.jpg',
    gallery: ['https://s1.cdn.autoevolution.com/images/news/gallery/watch-this-lamborghini-huracan-drift-donut-crash-into-barrier-then-catch-fire_15.jpg'],
  },
  'porsche-911-carrera': {
    gallery: ['https://www.carrerafever.net/wp-content/uploads/2025-Porsche-911-Carrera-Specs.jpg'],
  },
  'bmw-m4-competition': {
    imageUrl: 'https://d2mq8ajyfy4fws.cloudfront.net/wp-content/uploads/2024/11/27104805/fcd4b599232b3ff90b9ad8cb5572753a.jpg',
    gallery: ['https://editorial.pxcrush.net/carsales/general/editorial/2021_bmw_m4-1.jpg?height=682&width=1024'],
  },
  'nissan-gt-r': {
    imageUrl: 'https://www.autoblog.com/.image/MjA5MTc4Mjc4NjIzNzgyNzU2/2012%20Nissan%20GT-R.jpg?profile=w1536&x=50&y=50',
    gallery: ['https://img.goodfon.com/wallpaper/nbig/f/1d/nissan-gtr-r35-blue-front-sight.webp'],
  },
  'byd-seal': {
    imageUrl: 'https://asset.carwyapar.com/Car%20Images/BYD/Seal/BYD-Seal-Premium/sidefront.webp',
    gallery: ['https://www.bratislavak.sk/assets/images/ba/articles/img-inline/byd-20260423033116.webp'],
  },
};

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

for (const car of SEED_CARS) {
  const photoUpdate = VEHICLE_PHOTO_UPDATES[car.id] || {};
  if (photoUpdate.imageUrl) car.imageUrl = photoUpdate.imageUrl;
  car.gallery = [...(car.gallery || []), ...(photoUpdate.gallery || [])]
    .filter((url, index, all) => Boolean(url) && url !== car.imageUrl && all.indexOf(url) === index)
    .slice(0, 5);
}

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
