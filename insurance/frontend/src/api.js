const apiUrl = (
  import.meta.env.VITE_INSURANCE_API_URL || 'http://localhost:3010/api'
).replace(/\/$/, '');
export async function request(
  path,
  { method = 'GET', body, token, signal } = {},
) {
  try {
    const response = await fetch(apiUrl + path, {
      method,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(result.error?.message || 'ไม่สามารถทำรายการได้'),
        { code: result.error?.code, details: result.error?.details },
      );
    return result.data;
  } catch (error) {
    if (error.name === 'AbortError' && signal?.aborted) throw error;
    if (error.code) throw error;
    throw new Error(
      'เชื่อมต่อระบบไม่สำเร็จหรือใช้เวลานานเกินไป กรุณาลองอีกครั้ง หากกำลังยืนยันรายการ ให้ใช้คำขอเดิมเพื่อป้องกันรายการซ้ำ',
      { cause: error },
    );
  }
}
export const money = (value) =>
  new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
export function toyotyUrl() {
  const url = new URL(
    import.meta.env.VITE_TOYOTY_URL || 'http://localhost:5173',
  );
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Invalid TOYOTY URL configuration');
  return new URL('/insurance', url.origin).href;
}
