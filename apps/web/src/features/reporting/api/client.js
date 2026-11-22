import { createHttpClient } from '../../../lib/http.js';

export const reportingClient = createHttpClient(
  import.meta.env.VITE_REPORTING_API_URL || 'http://localhost:3005/api/v1',
);

// Reporting endpoints are manager-only and forward the existing Identity session.
reportingClient.defaults.withCredentials = true;

export async function getReport(path, params = {}, signal) {
  const { data } = await reportingClient.get(`reports/${path}`, {
    params,
    signal,
    withCredentials: true,
  });
  return data?.data ?? data;
}

export async function getActivityLogs(params = {}, signal) {
  const { data } = await reportingClient.get('activity-logs', {
    params, signal, withCredentials: true,
  });
  return data?.data ?? data;
}
