// รายการ API ทั้งหมดของทุก service พร้อม role ที่เรียกได้ (อ่านจาก routes.js ของแต่ละ service, origin/main 24 พ.ย. 2569)
// npm run test:status (Mocha) ใช้ไฟล์นี้เป็นรายการ API ที่ต้องยิงทดสอบจริง
// path ต่อท้าย base URL ของ service (รวม /api/v1 แล้ว)
// เมื่อเจ้าของ service เพิ่ม/เปลี่ยน route หรือสิทธิ์ ให้แก้ไฟล์นี้ตามด้วย

export const ROLES = [
  ['guest', 'ไม่ต้องล็อกอิน'],
  ['customer', 'Customer'],
  ['seller', 'Seller'],
  ['manager', 'Manager'],
  ['finance', 'Finance'],
  ['stock', 'Stock'],
  ['admin', 'Admin'],
];

const SIGNED_IN = ['customer', 'seller', 'manager', 'finance', 'stock', 'admin'];
const SALES_USERS = ['customer', 'seller', 'manager', 'admin'];
const SALES_STAFF = ['seller', 'manager', 'admin'];
const CATALOG_EDITORS = ['admin', 'stock'];
const FINANCE = ['admin', 'finance'];
const ALL = ['guest', ...SIGNED_IN];
// คิวผลิตรถสั่งทำ (catalog/src/modules/production ของดิว)
const QUEUE_READERS = ['admin', 'stock', 'manager', 'finance', 'seller'];

// [method, path, คำอธิบาย, roles, หมายเหตุ]
export const API_CATALOG = {
  identity: [
    ['GET', '/health', 'ตรวจสถานะ service', ALL],
    ['POST', '/auth/register', 'สมัครสมาชิก', ['guest']],
    ['POST', '/auth/login', 'เข้าสู่ระบบ', ['guest']],
    ['POST', '/auth/forgot-password', 'ขอลิงก์รีเซ็ตรหัสผ่าน', ['guest']],
    ['POST', '/auth/reset-password', 'ตั้งรหัสผ่านใหม่', ['guest']],
    ['POST', '/auth/logout', 'ออกจากระบบ', SIGNED_IN],
    ['GET', '/users/me', 'โปรไฟล์ของฉัน', SIGNED_IN],
    ['PATCH', '/users/me', 'แก้ไขโปรไฟล์ของฉัน', SIGNED_IN],
    ['GET', '/users', 'รายชื่อผู้ใช้ทั้งหมด', ['admin']],
    ['POST', '/users', 'สร้างผู้ใช้', ['admin']],
    ['PATCH', '/users/:id', 'แก้ไขผู้ใช้ / role', ['admin']],
  ],
  catalog: [
    ['GET', '/health', 'ตรวจสถานะ service', ALL],
    ['GET', '/cars', 'รายการรุ่นรถ', ALL],
    ['GET', '/cars/:id', 'รายละเอียดรุ่นรถ', ALL],
    ['GET', '/cars/stock-summary', 'สรุปสต็อก', ['manager', 'stock', 'admin']],
    ['POST', '/cars', 'เพิ่มรุ่นรถ', CATALOG_EDITORS],
    ['PATCH', '/cars/:id', 'แก้ไขรุ่นรถ', CATALOG_EDITORS],
    ['PATCH', '/cars/:id/stock', 'ตั้งจำนวนสต็อก', CATALOG_EDITORS],
    ['PUT', '/cars/:id/photos', 'อัปโหลดรูปรถ', CATALOG_EDITORS],
    ['DELETE', '/cars/:id', 'ลบรุ่นรถ', CATALOG_EDITORS],
    ['GET', '/promotions', 'รายการโปรโมชัน', ALL],
    ['GET', '/promotions/:id', 'รายละเอียดโปรโมชัน', ALL],
    ['POST', '/promotions', 'เพิ่มโปรโมชัน', CATALOG_EDITORS],
    ['PATCH', '/promotions/:id', 'แก้ไขโปรโมชัน', CATALOG_EDITORS],
    ['DELETE', '/promotions/:id', 'ลบโปรโมชัน', CATALOG_EDITORS],
    ['GET', '/covers', 'ภาพปกหน้าเว็บ', ALL],
    ['PUT', '/covers/:slot', 'เปลี่ยนภาพปก', CATALOG_EDITORS],
    ['GET', '/production/eta', 'ช่วงวันรับรถโดยประมาณ (?model=&trim=)', ALL],
    ['GET', '/production/cars/:carId', 'สถานะผลิตของรถ 1 คัน', ALL],
    ['GET', '/production/queue', 'รายการรถสั่งผลิต', QUEUE_READERS],
    ['GET', '/production/load', 'คิวผลิตต่อสัปดาห์แยกรุ่น', QUEUE_READERS],
    ['PUT', '/production/capacity/:model', 'ตั้งกำลังผลิตต่อสัปดาห์', CATALOG_EDITORS],
    ['POST', '/production/cars/:carId/schedule', 'จองคิวผลิต', CATALOG_EDITORS],
    ['PATCH', '/production/cars/:carId', 'เลื่อนขั้นผลิต / ส่งมอบ', [...CATALOG_EDITORS, 'seller'], 'Seller ทำได้แค่ DELIVER'],
  ],
  sales: [
    ['GET', '/health', 'ตรวจสถานะ service', ALL],
    ['GET', '/lookups/cars', 'ตัวเลือกรุ่นรถ', SALES_USERS],
    ['GET', '/lookups/insurances', 'ตัวเลือกประกัน', SALES_USERS],
    ['GET', '/lookups/actor', 'ข้อมูลผู้ใช้ฝั่ง Sales', SALES_USERS],
    ['GET', '/lookups/customers', 'รายชื่อลูกค้า', SALES_STAFF],
    ['GET', '/lookups/customers/:id', 'รายละเอียดลูกค้า', SALES_STAFF, 'Seller เห็นเฉพาะลูกค้าที่เกี่ยวข้อง'],
    ['GET', '/lookups/sellers', 'รายชื่อพนักงานขาย', SALES_STAFF],
    ['GET', '/appointments', 'รายการนัดหมาย', SALES_USERS, 'Customer/Seller เห็นเฉพาะของตัวเอง'],
    ['GET', '/appointments/availability', 'ช่วงเวลาว่าง', ['customer']],
    ['POST', '/appointments', 'จองนัดหมาย / ส่งคำขอ', ['customer']],
    ['PATCH', '/appointments/:id/status', 'อัปเดตสถานะนัดหมาย', SALES_USERS],
    ['PATCH', '/appointments/:id/assign', 'มอบหมาย Seller', ['manager', 'admin']],
    ['DELETE', '/appointments/:id', 'ลบนัดหมาย', ['admin']],
    ['GET', '/orders', 'รายการออเดอร์', SALES_USERS, 'Customer/Seller เห็นเฉพาะของตัวเอง'],
    ['POST', '/orders', 'สร้างฟอร์มขาย', ['seller']],
    ['PATCH', '/orders/:id/decision', 'อนุมัติ / ไม่อนุมัติออเดอร์', ['manager', 'admin']],
  ],
  payment: [
    ['GET', '/health', 'ตรวจสถานะ service', ALL],
    ['GET', '/order-balances', 'ยอดคงค้างของออเดอร์', SIGNED_IN, 'Customer/Seller เห็นเฉพาะของตัวเอง'],
    ['GET', '/payments', 'รายการชำระเงิน', SIGNED_IN, 'Customer/Seller เห็นเฉพาะของตัวเอง'],
    ['GET', '/payments/:id', 'รายละเอียดการชำระ', SIGNED_IN, 'ตรวจความเป็นเจ้าของ'],
    ['GET', '/orders/:orderId/payments', 'การชำระของออเดอร์', SIGNED_IN, 'ตรวจความเป็นเจ้าของ'],
    ['POST', '/orders/:orderId/payments', 'ชำระเงิน (จำลอง)', ['customer', ...FINANCE]],
    ['PATCH', '/payments/:id', 'แก้สถานะการชำระ', FINANCE],
    ['GET', '/refunds', 'รายการคืนเงิน', SIGNED_IN, 'Customer/Seller เห็นเฉพาะของตัวเอง'],
    ['GET', '/me/refunds', 'คำขอคืนเงินของฉัน', ['customer']],
    ['GET', '/refunds/:id', 'รายละเอียดคืนเงิน', SIGNED_IN, 'ตรวจความเป็นเจ้าของ'],
    ['GET', '/orders/:orderId/refunds', 'การคืนเงินของออเดอร์', SIGNED_IN, 'ตรวจความเป็นเจ้าของ'],
    ['POST', '/payments/:paymentId/refunds', 'ขอคืนเงิน', ['customer', ...FINANCE]],
    ['POST', '/refunds/:id/approve', 'อนุมัติคืนเงิน', FINANCE],
    ['POST', '/refunds/:id/reject', 'ปฏิเสธคืนเงิน', FINANCE],
    ['GET', '/invoices', 'รายการใบแจ้งหนี้', SIGNED_IN, 'Customer/Seller เห็นเฉพาะของตัวเอง'],
    ['GET', '/me/invoices', 'ใบแจ้งหนี้ของฉัน', ['customer']],
    ['GET', '/invoices/:id', 'รายละเอียดใบแจ้งหนี้', SIGNED_IN, 'ตรวจความเป็นเจ้าของ'],
    ['GET', '/invoices/:id/pdf', 'ดาวน์โหลด PDF ใบแจ้งหนี้', SIGNED_IN, 'ตรวจความเป็นเจ้าของ'],
    ['GET', '/orders/:orderId/invoices', 'ใบแจ้งหนี้ของออเดอร์', SIGNED_IN, 'ตรวจความเป็นเจ้าของ'],
    ['POST', '/orders/:orderId/invoices', 'ออกใบแจ้งหนี้', ['seller', 'manager', ...FINANCE]],
    ['POST', '/invoices/:id/cancel', 'ยกเลิกใบแจ้งหนี้', ['manager', ...FINANCE]],
    ['GET', '/finance-requests', 'รายการเรื่องส่งการเงิน', ['seller', 'manager', ...FINANCE]],
    ['POST', '/finance-requests', 'ส่งเรื่องการเงิน', ['seller']],
    ['POST', '/finance-requests/:id/reply', 'ตอบเรื่องการเงิน', FINANCE],
  ],
  reporting: [
    ['GET', '/health', 'ตรวจสถานะ service', ALL],
    ['GET', '/reports/sales-summary', 'สรุปยอดขาย', ['manager', 'admin']],
    ['GET', '/reports/sales-by-seller', 'ยอดขายตามพนักงาน', ['manager', 'admin']],
    ['GET', '/reports/sales-by-model', 'ยอดขายตามรุ่นรถ', ['manager', 'admin']],
    ['GET', '/reports/orders', 'รายการออเดอร์', ['manager', 'admin']],
    ['GET', '/reports/sales-by-configuration', 'ยอดขายตามรุ่นย่อย / สี / ล้อ', ['manager', 'admin']],
    ['GET', '/reports/inventory', 'รถ TOYOTY แยกรุ่น × รุ่นย่อย + คิวผลิต', ['manager', 'admin']],
    ['GET', '/reports/production-delays', 'รถสั่งผลิตที่ล่าช้า', ['manager', 'admin']],
    ['GET', '/reports/appointments', 'รายงานนัดหมาย', ['manager', 'admin']],
    ['GET', '/reports/finance', 'รายงานการเงิน', ['manager', 'admin']],
    ['GET', '/reports/activity', 'ฟีดกิจกรรมจากทุก service', ['manager', 'admin']],
    ['GET', '/activity-logs', 'ค้นหา activity log', ['manager', 'admin']],
  ],
};
