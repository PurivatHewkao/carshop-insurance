import { createHttpClient } from '../../../lib/http.js';
export const identityClient = createHttpClient(
  import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:3001/api/v1',
);
