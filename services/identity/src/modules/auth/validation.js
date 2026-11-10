export function fail(status, code, message) {
  throw Object.assign(new Error(message), { status, code, expose: true });
}
export function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    fail(400, 'VALIDATION_ERROR', 'กรุณาส่งข้อมูลแบบ JSON object');
}
export function credentials(body) {
  validateBody(body);
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail(400, 'VALIDATION_ERROR', 'กรุณาระบุอีเมลให้ถูกต้อง');
  if (
    typeof body.password !== 'string' ||
    body.password.length < 8 ||
    body.password.length > 128
  )
    fail(400, 'VALIDATION_ERROR', 'รหัสผ่านต้องมีความยาว 8–128 ตัวอักษร');
  return { email, password: body.password };
}
export function profile(body) {
  validateBody(body);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!name || name.length > 100)
    fail(400, 'VALIDATION_ERROR', 'กรุณาระบุชื่อความยาวไม่เกิน 100 ตัวอักษร');
  if (!/^0[0-9]{8,9}$/.test(phone))
    fail(
      400,
      'VALIDATION_ERROR',
      'เบอร์โทรศัพท์ต้องมี 9–10 หลัก เริ่มต้นด้วย 0',
    );
  return { name, phone };
}
