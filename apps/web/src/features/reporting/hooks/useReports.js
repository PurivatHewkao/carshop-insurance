import { useEffect, useState } from 'react';
import { getReport } from '../api/client.js';

export const REPORTS = [
  ['sales-summary', 'ภาพรวมยอดขาย'],
  ['sales-by-seller', 'ยอดขายตามพนักงาน'],
  ['sales-by-model', 'ยอดขายตามรุ่นรถ'],
  ['inventory', 'รายงานรถและสต็อก'],
  ['appointments', 'รายงานนัดหมาย'],
  ['finance', 'รายงานการเงิน'],
];

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB', maximumFractionDigits: 2,
  }).format(number);
}

export function getRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.series)) return value.series;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
}

export function getMessage(error) {
  const body = error?.response?.data;
  return body?.error?.message || body?.message || error?.message || 'ไม่สามารถโหลดข้อมูลได้';
}

// Loads every Reporting endpoint for the selected filters. `loading` is derived
// from whether the stored result belongs to the current request, so the effect
// only sets state from the async callback (no cascading synchronous renders).
export function useReports({ dateFrom = '', dateTo = '', groupBy = 'month', refresh = 0, reports = REPORTS } = {}) {
  const endpoints = reports.map(([endpoint]) => endpoint).join(',');
  const requestKey = JSON.stringify([dateFrom, dateTo, groupBy, refresh, endpoints]);
  const [state, setState] = useState({ key: null, data: {}, errors: {} });

  useEffect(() => {
    const controller = new AbortController();
    const params = { group_by: groupBy };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const keys = endpoints.split(',');
    Promise.allSettled(keys.map((endpoint) => getReport(endpoint, params, controller.signal))).then((results) => {
      if (controller.signal.aborted) return;
      const data = {};
      const errors = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') data[keys[index]] = result.value;
        else errors[keys[index]] = getMessage(result.reason);
      });
      setState({ key: requestKey, data, errors });
    });
    return () => controller.abort();
  }, [dateFrom, dateTo, groupBy, refresh, endpoints, requestKey]);

  return { data: state.data, errors: state.errors, loading: state.key !== requestKey };
}
