// apps/web/src/features/sales/api/mockSalesData.js

const STORAGE_KEYS = {
  REQUESTS: 'carshop_sales_requests_v1',
  TASKS: 'carshop_sales_tasks_v1',
  ORDERS: 'carshop_sales_orders_v1',
};

export const SELLERS_LIST = [
  { id: 'SL-01', name: 'คุณสมชาย (Senior Sales)', branch: 'สาขากรุงเทพฯ', activeTasks: 3 },
  { id: 'SL-02', name: 'คุณกานดา (Sales Executive)', branch: 'สาขาปทุมธานี', activeTasks: 2 },
  { id: 'SL-03', name: 'คุณณัฐพล (Insurance Specialist)', branch: 'สาขานนทบุรี', activeTasks: 1 },
];

export const CAR_MODELS = [
  'Toyoty Camry 2.5 HEV Premium',
  'Toyoty Corolla Cross 1.8 HEV',
  'Toyoty Hilux Revo Rocco',
  'Toyoty Yaris Ativ 1.2 Smart',
  'Toyoty Fortuner Leader G',
];

export const INSURANCE_PLANS = [
  'ประกันภัยชั้น 1 ซ่อมห้าง (Tokyo Marine)',
  'ประกันภัยชั้น 1 ซ่อมอู่ (Viriyah Insurance)',
  'ประกันภัยชั้น 2+ คุ้มครองจัดเต็ม',
  'ไม่รับประกันภัยเพิ่มเติม (เฉพาะ พ.ร.บ.)',
];

const INITIAL_REQUESTS = [
  {
    id: 'REQ-2026-001',
    customerName: 'กิตติพงศ์ วงศ์สวัสดิ์',
    phone: '081-234-5678',
    type: 'ทดลองขับ (Test Drive)',
    carModel: 'Toyoty Corolla Cross 1.8 HEV',
    preferredDate: '2026-10-20',
    preferredTime: '10:30',
    status: 'PENDING',
    assignedSeller: null,
    note: 'สนใจสีขาวมุก ต้องการเปรียบเทียบโปรโมชั่นดอกเบี้ย',
  },
  {
    id: 'REQ-2026-002',
    customerName: 'พิมพ์ชนก เลิศล้ำ',
    phone: '089-876-5432',
    type: 'ปรึกษาประกันภัยและไฟแนนซ์',
    carModel: 'Toyoty Camry 2.5 HEV Premium',
    preferredDate: '2026-10-21',
    preferredTime: '14:00',
    status: 'ASSIGNED',
    assignedSeller: 'คุณสมชาย (Senior Sales)',
    note: 'ต้องการใบเสนอราคาดาวน์ 25% ผ่อน 48 งวด',
  },
  {
    id: 'REQ-2026-003',
    customerName: 'ธนากร เจริญรุ่งเรือง',
    phone: '062-345-6789',
    type: 'นัดรับรถ / ตรวจเช็คเอกสาร',
    carModel: 'Toyoty Hilux Revo Rocco',
    preferredDate: '2026-10-22',
    preferredTime: '11:00',
    status: 'PENDING',
    assignedSeller: null,
    note: 'ลูกค้าเก่า ขอส่วนลดประกันชั้น 1',
  },
];

const INITIAL_TASKS = [
  {
    id: 'TSK-101',
    requestId: 'REQ-2026-002',
    customerName: 'พิมพ์ชนก เลิศล้ำ',
    phone: '089-876-5432',
    taskTitle: 'ติดตามใบเสนอราคา Camry 2.5 HEV + ประกันชั้น 1',
    dueDate: '2026-10-21 14:00',
    sellerName: 'คุณสมชาย (Senior Sales)',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    note: 'ส่งรายละเอียดไฟแนนซ์เบื้องต้นทาง LINE แล้ว รอนัดเจอที่โชว์รูม',
  },
  {
    id: 'TSK-102',
    requestId: 'REQ-2026-000',
    customerName: 'วรเมธ สุขเกษม',
    phone: '085-555-1212',
    taskTitle: 'นัดทดลองขับ Yaris Ativ และแจ้งเบี้ยประกัน',
    dueDate: '2026-10-19 13:00',
    sellerName: 'คุณกานดา (Sales Executive)',
    priority: 'NORMAL',
    status: 'PENDING',
    note: 'ลูกค้าขอเลื่อนจากสัปดาห์ก่อน',
  },
];

const INITIAL_ORDERS = [
  {
    id: 'ORD-2026-881',
    customerName: 'พิมพ์ชนก เลิศล้ำ',
    carModel: 'Toyoty Camry 2.5 HEV Premium',
    insurancePlan: 'ประกันภัยชั้น 1 ซ่อมห้าง (Tokyo Marine)',
    carPrice: 1475000,
    insurancePrice: 28500,
    discount: 30000,
    totalAmount: 1473500,
    sellerName: 'คุณสมชาย (Senior Sales)',
    createdAt: '2026-10-15',
    status: 'PENDING_APPROVAL',
    managerComment: '',
  },
  {
    id: 'ORD-2026-882',
    customerName: 'สุรศักดิ์ ภักดี',
    carModel: 'Toyoty Yaris Ativ 1.2 Smart',
    insurancePlan: 'ประกันภัยชั้น 1 ซ่อมอู่ (Viriyah Insurance)',
    carPrice: 594000,
    insurancePrice: 16500,
    discount: 10000,
    totalAmount: 600500,
    sellerName: 'คุณกานดา (Sales Executive)',
    createdAt: '2026-10-14',
    status: 'APPROVED',
    managerComment: 'อนุมัติแคมเปญพิเศษประจำเดือนตุลาคม',
  },
];

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

export const salesStore = {
  getRequests: () => loadFromStorage(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS),
  saveRequests: (list) => saveToStorage(STORAGE_KEYS.REQUESTS, list),

  getTasks: () => loadFromStorage(STORAGE_KEYS.TASKS, INITIAL_TASKS),
  saveTasks: (list) => saveToStorage(STORAGE_KEYS.TASKS, list),

  getOrders: () => loadFromStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS),
  saveOrders: (list) => saveToStorage(STORAGE_KEYS.ORDERS, list),
};