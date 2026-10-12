import { createHttpClient } from '../../../lib/http.js';
export const paymentClient = createHttpClient(
  import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:3004/api/v1',
);
