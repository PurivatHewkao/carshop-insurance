import { identityClient } from './client.js';

export const isDemo = import.meta.env.VITE_IDENTITY_MODE === 'demo';
export const demoAccount = {
  email: 'customer@toyoty.demo',
  password: 'Toyoty123!',
};
let users = [
  {
    id: 'demo-1',
    name: 'ลูกค้า ตัวอย่าง',
    email: demoAccount.email,
    phone: '0812345678',
    role: 'customer',
    status: 'active',
  },
  {
    id: 'demo-2',
    name: 'โจเซฟ ผู้ดูแล',
    email: 'admin@toyoty.demo',
    phone: '0898765432',
    role: 'admin',
    status: 'active',
  },
  {
    id: 'demo-3',
    name: 'ทีมขาย ตัวอย่าง',
    email: 'seller@toyoty.demo',
    phone: '0823456789',
    role: 'seller',
    status: 'inactive',
  },
];
// undefined means the browser session hasn't been checked yet; null means signed out.
let session = isDemo ? null : undefined;
const listeners = new Set();
export const subscribeSession = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getSession = () => session;
function setSession(user) {
  session = user;
  listeners.forEach((listener) => listener());
}
async function request(method, url, data, signal, startingSession = false) {
  const previousSession = session;
  let response;
  try {
    response = await identityClient.request({
      method,
      url,
      data,
      signal,
      headers: startingSession ? { 'X-Identity-Session': 'cookie' } : {},
    });
  } catch (error) {
    if (
      !startingSession &&
      error.response?.status === 401 &&
      session === previousSession
    ) {
      setSession(null);
    }
    throw error;
  }
  return response.data?.data;
}
function acceptSession(result) {
  const user = validateUser(result?.user);
  setSession(user);
  return user;
}
export async function login(values) {
  if (!isDemo)
    return acceptSession(
      await request('post', 'auth/login', values, undefined, true),
    );
  const user = users.find(
    (item) => item.email === values.email.trim().toLowerCase(),
  );
  if (
    !user ||
    !user.id.startsWith('demo-') ||
    values.password !== demoAccount.password
  )
    throw new Error('ใช้บัญชีตัวอย่างที่ระบุด้านล่างเพื่อทดลองเข้าสู่ระบบ');
  if (user.status !== 'active') throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
  setSession({ ...user });
  return user;
}
export async function register(values) {
  if (!isDemo)
    return acceptSession(
      await request('post', 'auth/register', values, undefined, true),
    );
  if (users.some((item) => item.email === values.email))
    throw new Error('อีเมลนี้มีบัญชีอยู่แล้ว');
  // No passwords are stored. A registered demo account opens a temporary session.
  const user = {
    id: crypto.randomUUID(),
    name: values.name,
    email: values.email,
    phone: values.phone,
    role: 'customer',
    status: 'active',
  };
  users = [...users, user];
  setSession(user);
  return user;
}
export async function logout() {
  if (!isDemo) {
    try {
      await request('post', 'auth/logout');
    } catch (error) {
      if (error.response?.status !== 401) throw error;
    }
  }
  setSession(null);
}
export async function getProfile(signal) {
  if (session === null) throw new Error('กรุณาเข้าสู่ระบบก่อนดูข้อมูลบัญชี');
  if (isDemo) return validateUser({ ...session });
  const previousSession = session;
  const user = validateUser(
    await request('get', 'users/me', undefined, signal),
  );
  if (
    !signal?.aborted &&
    session === previousSession &&
    Object.keys(user).some((key) => user[key] !== session?.[key])
  )
    setSession(user);
  return user;
}
export async function updateProfile(values) {
  if (!session) throw new Error('กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล');
  const payload = { name: values.name, phone: values.phone };
  const user = isDemo
    ? { ...session, ...payload }
    : await request('patch', 'users/me', payload);
  validateUser(user);
  if (isDemo) users = users.map((item) => (item.id === user.id ? user : item));
  setSession(user);
  return user;
}
export async function listUsers(signal) {
  requireAdmin();
  const result = isDemo
    ? users.map((user) => ({ ...user }))
    : await request('get', 'users', undefined, signal);
  if (!Array.isArray(result))
    throw new Error('รูปแบบรายการผู้ใช้ไม่ตรงกับ contract');
  return result.map(validateUser);
}
export async function createUser(values) {
  requireAdmin();
  if (isDemo) throw new Error('การสร้างผู้ใช้ต้องใช้โหมด API');
  return validateUser(await request('post', 'users', values));
}
export async function updateUser(id, values) {
  requireAdmin();
  if (id === session.id)
    throw new Error('ไม่สามารถแก้สิทธิ์บัญชีตนเองในหน้านี้');
  const payload = { role: values.role, status: values.status };
  if (!isDemo)
    return validateUser(
      await request('patch', `users/${encodeURIComponent(id)}`, payload),
    );
  if (!users.some((user) => user.id === id)) throw new Error('ไม่พบผู้ใช้');
  users = users.map((user) =>
    user.id === id ? validateUser({ ...user, ...payload }) : user,
  );
  return users.find((item) => item.id === id);
}
function requireAdmin() {
  if (session?.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
}
function validateUser(user) {
  if (
    !user ||
    !['id', 'name', 'email', 'phone'].every(
      (key) => typeof user[key] === 'string',
    ) ||
    !['customer', 'seller', 'manager', 'admin', 'finance', 'stock'].includes(
      user.role,
    ) ||
    !['active', 'inactive'].includes(user.status)
  ) {
    throw new Error('รูปแบบข้อมูลผู้ใช้ไม่ตรงกับ contract');
  }
  return user;
}
export function authError(error) {
  if (error.response?.status === 401)
    return 'เซสชันหมดอายุหรือข้อมูลเข้าสู่ระบบไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง';
  if (error.response?.status === 403) return 'บัญชีนี้ไม่มีสิทธิ์ดำเนินการ';
  if (error.response?.status === 409)
    return error.response.data?.error?.message || 'ข้อมูลขัดแย้ง กรุณาโหลดใหม่';
  if ([400, 429].includes(error.response?.status))
    return (
      error.response.data?.error?.message || 'กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง'
    );
  if (error.response || error.code)
    return 'ไม่สามารถติดต่อระบบบัญชีได้ กรุณาลองอีกครั้ง';
  return error.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
}
