import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDays,
  daysBetween,
  etaForWeek,
  firstFreeWeek,
  fromSatang,
  isMonday,
  mondayOnOrAfter,
  mondayOnOrBefore,
  toSatang,
  today,
} from '../src/modules/configurator/schedule.js';

test('Mondays', () => {
  assert.equal(mondayOnOrAfter('2026-12-15'), '2026-12-21'); // Tuesday → next Monday
  assert.equal(mondayOnOrAfter('2026-12-21'), '2026-12-21'); // already Monday
  assert.equal(mondayOnOrBefore('2026-11-29'), '2026-11-23'); // Sunday → previous Monday
  assert.ok(isMonday('2027-01-18'));
  assert.ok(!isMonday('2027-01-19'));
  assert.ok(!isMonday('2027-02-30'));
});

test('pick-up window is build week +7 to +14 days', () => {
  // Example in the proposal: built in the week of 18 Jan → 25 Jan – 1 Feb 2027.
  assert.deepEqual(etaForWeek('2027-01-18'), {
    buildWeek: '2027-01-18',
    from: '2027-01-25',
    to: '2027-02-01',
  });
});

test('first free week skips full weeks', () => {
  const slots = new Map([
    ['2026-12-21', { capacity: 5, booked: 5 }],
    ['2026-12-28', { capacity: 0, booked: 0 }],
  ]);
  const result = firstFreeWeek({
    orderDate: '2026-11-24',
    leadDays: 21, // Balanced: parts ready 15 Dec
    slots,
    defaultCapacity: 5,
  });
  assert.equal(result.partsReady, '2026-12-15');
  assert.equal(result.buildWeek, '2027-01-04');
  assert.equal(result.from, '2027-01-11');
});

test('queue full for two years gives null', () => {
  const result = firstFreeWeek({
    orderDate: '2026-11-24',
    leadDays: 14,
    slots: new Map(),
    defaultCapacity: 0,
  });
  assert.equal(result, null);
});

test('dates and money helpers', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysBetween('2027-01-04', '2027-02-08'), 35);
  assert.match(today(new Date('2026-11-23T18:30:00Z')), /^2026-11-24$/); // already 24th in Bangkok
  assert.equal(
    fromSatang(toSatang('2210000.00') + toSatang('15000.00')),
    '2225000.00',
  );
});
