// Date helpers for the made-to-order queue. Dates are 'YYYY-MM-DD' strings
// (calendar days in Thailand), so there is no time-zone drift.

export const TRIM_CODES = ['ECO', 'BALANCED', 'HIGH_PERFORMANCE'];

// Order of the production steps. A car moves forward one step at a time.
export const PRODUCTION_STEPS = [
  'QUOTED',
  'SCHEDULED',
  'IN_PRODUCTION',
  'IN_TRANSIT',
  'READY',
  'DELIVERED',
];

// Pick-up window = build week start + 7 days to + 14 days (build + QC + transport).
export const ETA_FROM_DAYS = 7;
export const ETA_TO_DAYS = 14;
// How far ahead the queue is searched for a free week.
export const MAX_QUEUE_WEEKS = 104;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && toDate(date) === value;
}

function toDate(date) {
  return date.toISOString().slice(0, 10);
}

/** Today in Asia/Bangkok. */
export function today(now = new Date()) {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

export function addDays(day, days) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return toDate(date);
}

export function isMonday(day) {
  return isDate(day) && new Date(day + 'T00:00:00Z').getUTCDay() === 1;
}

/** The Monday on or after `day`. */
export function mondayOnOrAfter(day) {
  const weekday = new Date(day + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
  return addDays(day, (8 - weekday) % 7);
}

/** The Monday on or before `day`. */
export function mondayOnOrBefore(day) {
  const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function daysBetween(from, to) {
  return Math.round(
    (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) /
      86_400_000,
  );
}

export function etaForWeek(buildWeek) {
  return {
    buildWeek,
    from: addDays(buildWeek, ETA_FROM_DAYS),
    to: addDays(buildWeek, ETA_TO_DAYS),
  };
}

/**
 * First week with a free slot, starting from the first Monday after the parts arrive.
 * `slots` maps 'YYYY-MM-DD' (Monday) → { capacity, booked }; a missing week has
 * `defaultCapacity` places and nothing booked. Returns null when every week is full.
 */
export function firstFreeWeek({ orderDate, leadDays, slots, defaultCapacity }) {
  const partsReady = addDays(orderDate, leadDays);
  let week = mondayOnOrAfter(partsReady);
  for (let i = 0; i < MAX_QUEUE_WEEKS; i += 1) {
    const slot = slots.get(week);
    const capacity = slot ? slot.capacity : defaultCapacity;
    const booked = slot ? slot.booked : 0;
    if (booked < capacity) return { partsReady, ...etaForWeek(week) };
    week = addDays(week, 7);
  }
  return null;
}

// Money: DECIMAL strings in, whole satang inside, DECIMAL strings out.
export function toSatang(value) {
  return Math.round(Number(value) * 100);
}

export function fromSatang(satang) {
  return (satang / 100).toFixed(2);
}
