import { ApiError } from '../errors.js';
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validatePurchase(body) {
  const details = [];
  const text = (value, field, max, required = true) => {
    if (
      typeof value !== 'string' ||
      value.trim().length > max ||
      (required && !value.trim()) ||
      [...value].some((char) => char.charCodeAt(0) < 32)
    ) {
      details.push({ field, message: 'กรุณากรอกข้อมูลให้ถูกต้อง' });
      return '';
    }
    return value.trim();
  };
  const planId = text(body?.planId, 'planId', 36);
  const clientRequestId = text(body?.clientRequestId, 'clientRequestId', 36);
  if (!uuid.test(planId))
    details.push({ field: 'planId', message: 'รหัสแผนไม่ถูกต้อง' });
  if (!uuid.test(clientRequestId))
    details.push({ field: 'clientRequestId', message: 'รหัสคำขอไม่ถูกต้อง' });
  const fullName = text(body?.customer?.fullName, 'customer.fullName', 150);
  const phone = text(body?.customer?.phone, 'customer.phone', 20);
  const email = text(
    body?.customer?.email,
    'customer.email',
    254,
  ).toLowerCase();
  if (!/^0[0-9]{8,9}$/.test(phone))
    details.push({
      field: 'customer.phone',
      message: 'ใช้เบอร์โทรศัพท์ไทย 9–10 หลัก',
    });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    details.push({ field: 'customer.email', message: 'อีเมลไม่ถูกต้อง' });
  const brand = text(body?.vehicle?.brand, 'vehicle.brand', 80);
  const model = text(body?.vehicle?.model, 'vehicle.model', 100);
  const year = body?.vehicle?.year;
  if (
    !Number.isInteger(year) ||
    year < 1950 ||
    year > new Date().getUTCFullYear() + 1
  )
    details.push({
      field: 'vehicle.year',
      message: 'ปีรถต้องเป็นปี ค.ศ. ระหว่าง 1950 ถึงปีหน้า',
    });
  const registrationNumber = text(
    body?.vehicle?.registrationNumber ?? '',
    'vehicle.registrationNumber',
    30,
    false,
  );
  const source =
    body?.source === undefined || body.source === '' || body.source === 'direct'
      ? 'direct'
      : body.source;
  if (source !== 'direct' && source !== 'toyoty')
    details.push({ field: 'source', message: 'ช่องทางไม่ถูกต้อง' });
  if (details.length)
    throw new ApiError(400, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', details);
  return {
    planId,
    clientRequestId,
    fullName,
    phone,
    email,
    brand,
    model,
    year,
    registrationNumber,
    source,
  };
}
