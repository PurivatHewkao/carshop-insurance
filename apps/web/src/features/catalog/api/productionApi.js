import { catalogClient } from './client.js';

/**
 * Production queue of made-to-order cars (services/catalog /production, owner: ดิว).
 * Dates are 'YYYY-MM-DD' (UTC).
 */

export const PRODUCTION_STATUS = {
  WAITING: { label: 'รอจัดคิว', tone: 'low' },
  SCHEDULED: { label: 'จัดคิวแล้ว', tone: 'plan' },
  IN_PRODUCTION: { label: 'กำลังผลิต', tone: 'plan' },
  IN_TRANSIT: { label: 'กำลังขนส่ง', tone: 'plan' },
  READY: { label: 'ถึงศูนย์ รอส่งมอบ', tone: 'in' },
  DELIVERED: { label: 'ส่งมอบแล้ว', tone: 'done' },
  CANCELLED: { label: 'ยกเลิก', tone: 'out' },
};

export async function fetchProductionQueue(status, signal) {
  const params = status ? { status } : {};
  const { data } = await catalogClient.get('production/queue', {
    params,
    signal,
  });
  return data.data;
}

export async function fetchProductionLoad(weeks, signal) {
  const { data } = await catalogClient.get('production/load', {
    params: { weeks },
    signal,
  });
  return data.data;
}

/** Public estimate for the configurator: { buildWeek, etaFrom, etaTo, partsDays }. */
export async function fetchProductionEta(model, trim, signal) {
  const { data } = await catalogClient.get('production/eta', {
    params: { model, trim },
    signal,
  });
  return data.data;
}

/** Public: production state of one car (status null = stock car). */
export async function fetchCarProduction(carId, signal) {
  const { data } = await catalogClient.get(
    'production/cars/' + encodeURIComponent(carId),
    { signal },
  );
  return data.data;
}

export async function scheduleProduction(carId) {
  const { data } = await catalogClient.post(
    'production/cars/' + encodeURIComponent(carId) + '/schedule',
    {},
  );
  return data.data;
}

/** action: QUEUE | RESCHEDULE {buildWeek} | START {vin} | SHIP {arrivalDate} | ARRIVE | DELIVER */
export async function changeProduction(carId, body) {
  const { data } = await catalogClient.patch(
    'production/cars/' + encodeURIComponent(carId),
    body,
  );
  return data.data;
}

export async function saveWeeklyCapacity(modelId, weeklyCapacity) {
  const { data } = await catalogClient.put(
    'production/capacity/' + encodeURIComponent(modelId),
    { weeklyCapacity },
  );
  return data.data;
}

/** "25 ม.ค. 70" */
export function formatThaiDate(date) {
  if (!date) return '–';
  return new Date(date + 'T00:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

/** "25 ม.ค. – 1 ก.พ. 70", or one date when the window is a single day. */
export function formatEtaWindow(from, to) {
  if (!from || !to) return '–';
  if (from === to) return formatThaiDate(from);
  const short = new Date(from + 'T00:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return short + ' – ' + formatThaiDate(to);
}
