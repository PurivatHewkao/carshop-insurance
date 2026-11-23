// Request checks for the configurator, made-to-order cars and the admin option lists.
import { httpError } from '../../utils/httpError.js';
import { PRODUCTION_STEPS, TRIM_CODES, isDate, isMonday } from './schedule.js';

const FINISHES = ['SOLID', 'METALLIC', 'PEARL', 'SPECIAL'];
const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const IMAGE_PATTERN = /^(https?:\/\/|data:image\/)/i;
const MAX_IMAGE_LENGTH = 700_000;
const MAX_MONEY = 999_999_999_999;

function invalid(message) {
  return httpError(400, 'INVALID_INPUT', message);
}

function body(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid('Request body must be a JSON object');
  return value;
}

function ref(value, label, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw invalid(label + ' is required');
    return undefined;
  }
  const text = String(value).trim();
  if (!text || text.length > 60) throw invalid(label + ' is not valid');
  return text;
}

/**
 * { modelSlug | model | modelId, trim | trimId, colorId | color, wheelId | wheel }
 * Each value may be the code (slug) or the UUID.
 */
export function parseSelection(input) {
  const data = body(input);
  return {
    model: ref(data.modelSlug ?? data.model ?? data.modelId, 'modelSlug'),
    trim: ref(data.trim ?? data.trimId, 'trim'),
    color: ref(data.colorId ?? data.color, 'colorId'),
    wheel: ref(data.wheelId ?? data.wheel, 'wheelId', { required: false }),
  };
}

export function parseProduction(input) {
  const data = body(input);
  const result = {};
  if (data.status !== undefined) {
    if (!PRODUCTION_STEPS.includes(data.status))
      throw invalid('status must be one of ' + PRODUCTION_STEPS.join(', '));
    result.status = data.status;
  }
  if (data.buildWeek !== undefined) {
    if (!isMonday(data.buildWeek))
      throw invalid('buildWeek must be a Monday (YYYY-MM-DD)');
    result.buildWeek = data.buildWeek;
  }
  if (data.date !== undefined) {
    if (!isDate(data.date)) throw invalid('date must be YYYY-MM-DD');
    result.date = data.date;
  }
  if (data.vin !== undefined && data.vin !== '') {
    const vin = String(data.vin).trim().toUpperCase();
    if (!VIN_PATTERN.test(vin))
      throw invalid('vin must be 17 letters/digits without I, O or Q');
    result.vin = vin;
  }
  if (result.status === undefined && result.buildWeek === undefined)
    throw invalid('Send status (next step) or buildWeek (reschedule)');
  return result;
}

export function parseCapacity(input) {
  const data = body(input);
  const capacity = Number(data.capacity);
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 500)
    throw invalid('capacity must be an integer between 0 and 500');
  if (data.weekStart !== undefined && !isMonday(data.weekStart))
    throw invalid('weekStart must be a Monday (YYYY-MM-DD)');
  return { capacity, weekStart: data.weekStart };
}

export function parseTrimCode(value) {
  if (value === undefined || value === '') return undefined;
  if (!TRIM_CODES.includes(value))
    throw invalid('trim must be one of ' + TRIM_CODES.join(', '));
  return value;
}

export function parseProductionStatus(value) {
  if (value === undefined || value === '') return undefined;
  if (!PRODUCTION_STEPS.includes(value))
    throw invalid('productionStatus is not valid');
  return value;
}

// ---- admin forms: every field optional on PATCH, the listed ones required on POST ----

function text(data, field, max, out) {
  if (data[field] === undefined) return;
  if (data[field] === null || data[field] === '') {
    out[field] = null;
    return;
  }
  if (typeof data[field] !== 'string' || data[field].trim().length > max)
    throw invalid(field + ' must be text of at most ' + max + ' characters');
  out[field] = data[field].trim();
}

function money(data, field, out) {
  if (data[field] === undefined) return;
  const value = Number(data[field]);
  if (!Number.isFinite(value) || value < 0 || value > MAX_MONEY)
    throw invalid(field + ' must be a number of baht ≥ 0');
  out[field] = value.toFixed(2);
}

function integer(data, field, min, max, out) {
  if (data[field] === undefined) return;
  if (data[field] === null) {
    out[field] = null;
    return;
  }
  const value = Number(data[field]);
  if (!Number.isInteger(value) || value < min || value > max)
    throw invalid(`${field} must be an integer between ${min} and ${max}`);
  out[field] = value;
}

function flag(data, field, out) {
  if (data[field] === undefined) return;
  if (typeof data[field] !== 'boolean')
    throw invalid(field + ' must be true or false');
  out[field] = data[field];
}

function image(data, field, out) {
  if (data[field] === undefined) return;
  if (data[field] === null || data[field] === '') {
    out[field] = null;
    return;
  }
  if (
    typeof data[field] !== 'string' ||
    data[field].length > MAX_IMAGE_LENGTH ||
    !IMAGE_PATTERN.test(data[field])
  )
    throw invalid(field + ' must be an http(s) URL or an uploaded image');
  out[field] = data[field];
}

function code(data, out) {
  if (data.code === undefined) return;
  if (typeof data.code !== 'string' || !CODE_PATTERN.test(data.code))
    throw invalid('code must be lower-case letters, digits or "-"');
  out.code = data.code;
}

function requireFields(out, fields) {
  for (const field of fields) {
    if (out[field] === undefined || out[field] === null)
      throw invalid(field + ' is required');
  }
}

export function parseColor(input, { create = false } = {}) {
  const data = body(input);
  const out = {};
  code(data, out);
  text(data, 'name', 50, out);
  if (data.hex !== undefined) {
    if (typeof data.hex !== 'string' || !HEX_PATTERN.test(data.hex))
      throw invalid('hex must look like #RRGGBB');
    out.hex = data.hex.toUpperCase();
  }
  if (data.finish !== undefined) {
    if (!FINISHES.includes(data.finish))
      throw invalid('finish must be one of ' + FINISHES.join(', '));
    out.finish = data.finish;
  }
  money(data, 'priceExtra', out);
  integer(data, 'sortOrder', 0, 1000, out);
  flag(data, 'active', out);
  if (create) requireFields(out, ['code', 'name', 'hex']);
  return out;
}

export function parseWheel(input, { create = false } = {}) {
  const data = body(input);
  const out = {};
  code(data, out);
  text(data, 'name', 80, out);
  integer(data, 'sizeInch', 12, 24, out);
  image(data, 'imageUrl', out);
  integer(data, 'sortOrder', 0, 1000, out);
  flag(data, 'active', out);
  if (create) requireFields(out, ['code', 'name', 'sizeInch']);
  return out;
}

export function parseTrim(input, { create = false } = {}) {
  const data = body(input);
  const out = {};
  if (data.code !== undefined) out.code = parseTrimCode(data.code);
  text(data, 'name', 50, out);
  text(data, 'tagline', 150, out);
  money(data, 'price', out);
  text(data, 'engine', 150, out);
  integer(data, 'horsepower', 0, 100_000, out);
  if (data.fuelEconomyKml !== undefined) {
    const value =
      data.fuelEconomyKml === null ? null : Number(data.fuelEconomyKml);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 999))
      throw invalid('fuelEconomyKml must be a number between 0 and 999');
    out.fuelEconomyKml = value;
  }
  text(data, 'transmission', 100, out);
  text(data, 'fuel', 50, out);
  if (data.features !== undefined) {
    if (
      !Array.isArray(data.features) ||
      data.features.length > 30 ||
      data.features.some(
        (item) => typeof item !== 'string' || item.length > 200,
      )
    )
      throw invalid('features must be a list of at most 30 short texts');
    out.features = data.features.map((item) => item.trim()).filter(Boolean);
  }
  integer(data, 'partsLeadDays', 0, 365, out);
  integer(data, 'sortOrder', 0, 1000, out);
  flag(data, 'active', out);
  if (create) requireFields(out, ['code', 'name', 'price']);
  return out;
}

export function parseTrimColors(input) {
  const list = body(input).colors;
  if (!Array.isArray(list) || list.length > 50)
    throw invalid('colors must be a list');
  const seen = new Set();
  return list.map((item) => {
    const colorId = ref(item?.colorId, 'colorId');
    if (seen.has(colorId)) throw invalid('a colour is listed twice');
    seen.add(colorId);
    const out = {};
    image(item, 'imageUrl', out);
    return { colorId, imageUrl: out.imageUrl ?? null };
  });
}

export function parseTrimWheels(input) {
  const data = body(input);
  if (!Array.isArray(data.wheels) || data.wheels.length > 20)
    throw invalid('wheels must be a list');
  const seen = new Set();
  const wheels = data.wheels.map((item) => {
    const wheelId = ref(item?.wheelId, 'wheelId');
    if (seen.has(wheelId)) throw invalid('a wheel is listed twice');
    seen.add(wheelId);
    const out = {};
    money({ priceExtra: item.priceExtra ?? 0 }, 'priceExtra', out);
    return { wheelId, priceExtra: out.priceExtra };
  });
  return {
    wheels,
    defaultWheelId: ref(data.defaultWheelId, 'defaultWheelId', {
      required: false,
    }),
  };
}
