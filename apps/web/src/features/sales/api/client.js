import { createHttpClient } from '../../../lib/http.js';
export const salesClient = createHttpClient(
  import.meta.env.VITE_SALES_API_URL || 'http://localhost:3003/api/v1',
);
