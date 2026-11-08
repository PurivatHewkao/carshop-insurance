import { useCallback, useEffect, useState } from 'react';
import { catalogClient } from './client.js';
import { getCarColorOptions } from '../data/catalogData.js';

/**
 * Calls to services/catalog (MySQL). A car's `id` is its URL slug
 * (e.g. "ferrari-296-gtb"); money arrives as decimal strings and is turned
 * into numbers here so the pages can keep sorting and formatting as before.
 */

export function apiErrorMessage(error) {
  const apiMessage = error?.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  if (error?.response)
    return 'ระบบ catalog ตอบกลับผิดพลาด (' + error.response.status + ')';
  if (error instanceof Error && !error.isAxiosError) return error.message;
  return 'เชื่อมต่อ catalog API ไม่ได้ ตรวจสอบว่ารัน services/catalog และตั้งค่า .env แล้ว';
}

function normalizeCar(raw) {
  const car = {
    ...raw,
    price: Number(raw.price),
    tag: raw.tag || '',
    variant: raw.variant || 'รุ่นมาตรฐาน',
    engine: raw.engine || 'ระบุสเปกภายหลัง',
    horsepower: raw.horsepower ?? 0,
    transmission: raw.transmission || 'ตรวจสอบตามรุ่นย่อย',
    drive: raw.drive || 'ตรวจสอบตามรุ่นย่อย',
    fuel: raw.fuel || '',
    seats: raw.seats ?? 5,
    location: raw.location || 'ยังไม่ระบุสถานที่เก็บรถ',
    warranty: raw.warranty || 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย',
    features: Array.isArray(raw.features) ? raw.features : [],
    gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
  };
  // Models without stored colours use the built-in colour list for their type.
  car.colorOptions = getCarColorOptions(car);
  return car;
}

// ---- Cars / stock ---------------------------------------------------------

/** One page of the stock list (filters and paging are done by the server). */
export async function fetchCarPage(params, signal) {
  const { data } = await catalogClient.get('cars', { params, signal });
  return { ...data, data: data.data.map(normalizeCar) };
}

async function fetchAllCars(signal, gallery) {
  const params = { pageSize: 100 };
  if (gallery) params.include = 'gallery';
  const { data } = await catalogClient.get('cars', { params, signal });
  return data.data.map(normalizeCar);
}

export const fetchCars = (signal) => fetchAllCars(signal, false);
export const fetchCarsWithGallery = (signal) => fetchAllCars(signal, true);

export async function fetchCar(ref, signal) {
  const { data } = await catalogClient.get('cars/' + encodeURIComponent(ref), {
    signal,
  });
  return normalizeCar(data.data);
}

export async function fetchStockSummary(signal) {
  const { data } = await catalogClient.get('cars/stock-summary', { signal });
  return data.data;
}

export async function saveCarStock(id, stock) {
  const { data } = await catalogClient.patch(
    'cars/' + encodeURIComponent(id) + '/stock',
    { stock },
  );
  return normalizeCar(data.data);
}

export async function createCarRecord(form) {
  const { data } = await catalogClient.post('cars', form);
  return normalizeCar(data.data);
}

export async function saveCarPhotos(id, photos) {
  const { data } = await catalogClient.put(
    'cars/' + encodeURIComponent(id) + '/photos',
    { photos },
  );
  return normalizeCar(data.data);
}

export async function removeCarRecord(id) {
  await catalogClient.delete('cars/' + encodeURIComponent(id));
}

// ---- Promotions -----------------------------------------------------------

const NO_END_DATE_YEAR = 2099;

function fromApiPromotion(row) {
  const endYear = new Date(row.endDate).getUTCFullYear();
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || '',
    badge: row.badge || 'โปรโมชัน',
    value: row.value || '',
    description: row.description || '',
    conditions: row.conditions || '',
    appliesTo: row.appliesTo || 'รถทุกรุ่น',
    imageUrl: row.imageUrl || '',
    startDate: row.startDate.slice(0, 10),
    endDate: endYear >= NO_END_DATE_YEAR ? '' : row.endDate.slice(0, 10),
    active: row.status === 'ACTIVE',
    discountType: row.discountType,
    discountValue: row.discountValue,
  };
}

function bahtFromText(text) {
  const match = /฿\s*([\d,]+)/.exec(String(text || ''));
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

function promotionBody(form) {
  return {
    title: form.title,
    subtitle: form.subtitle,
    badge: form.badge,
    value: form.value,
    description: form.description,
    conditions: form.conditions,
    appliesTo: form.appliesTo,
    imageUrl: form.imageUrl,
    endDate: (form.endDate || NO_END_DATE_YEAR + '-12-31') + 'T23:59:59Z',
    status: form.active ? 'ACTIVE' : 'INACTIVE',
  };
}

export async function fetchPromotions(signal) {
  const { data } = await catalogClient.get('promotions', { signal });
  return data.data.map(fromApiPromotion);
}

export async function createPromotionRecord(form) {
  const { data } = await catalogClient.post('promotions', {
    ...promotionBody(form),
    discountType: 'FIXED',
    discountValue: bahtFromText(form.value),
    startDate: form.startDate
      ? form.startDate + 'T00:00:00Z'
      : new Date().toISOString(),
  });
  return fromApiPromotion(data.data);
}

// Discount type/value are not editable in the form, so they are left as stored.
export async function updatePromotionRecord(id, form) {
  const body = promotionBody(form);
  if (form.startDate) body.startDate = form.startDate + 'T00:00:00Z';
  const { data } = await catalogClient.patch(
    'promotions/' + encodeURIComponent(id),
    body,
  );
  return fromApiPromotion(data.data);
}

export async function setPromotionActive(id, active) {
  await catalogClient.patch('promotions/' + encodeURIComponent(id), {
    status: active ? 'ACTIVE' : 'INACTIVE',
  });
}

export async function removePromotionRecord(id) {
  await catalogClient.delete('promotions/' + encodeURIComponent(id));
}

// ---- Hooks ----------------------------------------------------------------

/** Runs `load(signal)` on mount and whenever reload() is called (or `key` changes). */
function useLoader(load, initial, key = '') {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({
    key,
    data: initial,
    error: '',
    notFound: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => setState({ key, data, error: '', notFound: false }),
      (error) => {
        if (controller.signal.aborted) return;
        setState({
          key,
          data: initial,
          error: apiErrorMessage(error),
          notFound: error?.response?.status === 404,
        });
      },
    );
    return () => controller.abort();
    // `initial` is a constant for each caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, key, reloadKey]);
  return {
    data: state.data,
    error: state.error,
    notFound: state.notFound,
    loading: state.key !== key || (state.data === initial && !state.error),
    reload: () => setReloadKey((value) => value + 1),
  };
}

const NO_ITEMS = [];

export function usePromotions() {
  const { data, loading, error, reload } = useLoader(fetchPromotions, NO_ITEMS);
  return { promotions: data, loading, error, reload };
}

/** All car models. Pass { gallery: true } when the extra photos are needed. */
export function useCars({ gallery = false } = {}) {
  const { data, loading, error, reload } = useLoader(
    gallery ? fetchCarsWithGallery : fetchCars,
    NO_ITEMS,
  );
  return { cars: data, loading, error, reload };
}

const NO_CAR = null;

/** One car by slug, UUID or name. */
export function useCar(ref) {
  const load = useCallback((signal) => fetchCar(ref, signal), [ref]);
  const { data, loading, error, notFound } = useLoader(load, NO_CAR, ref);
  return { car: data, loading, error, notFound };
}
