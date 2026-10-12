import { createHttpClient } from '../../../lib/http.js';
export const catalogClient = createHttpClient(
  import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:3002/api/v1',
);
