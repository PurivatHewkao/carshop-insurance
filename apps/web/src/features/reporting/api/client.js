import { createHttpClient } from '../../../lib/http.js';
export const reportingClient = createHttpClient(
  import.meta.env.VITE_REPORTING_API_URL || 'http://localhost:3005/api/v1',
);
