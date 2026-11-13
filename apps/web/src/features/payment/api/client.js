import { createHttpClient } from '../../../lib/http.js';
export const paymentClient = createHttpClient(
  import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:3004/api/v1',
);
// ส่ง cookie session ของ Identity ไปด้วย (Payment ตรวจ login/role ที่ backend)
paymentClient.defaults.withCredentials = true;
