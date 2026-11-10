import { salesClient } from './client.js';

// Calls to services/sales (MySQL). Every endpoint answers { data }.
// Money fields arrive as numbers (the server does the arithmetic in satang).

export function salesError(error) {
  const apiMessage = error?.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  if (error?.response)
    return 'ระบบ sales ตอบกลับผิดพลาด (' + error.response.status + ')';
  if (error instanceof Error && !error.isAxiosError) return error.message;
  return 'เชื่อมต่อ sales API ไม่ได้ ตรวจสอบว่ารัน services/sales และตั้งค่า .env แล้ว';
}

const unwrap = (response) => response.data.data;

// ---- Lookups (dropdown data) ------------------------------------------------
export const fetchCars = (signal) =>
  salesClient.get('lookups/cars', { signal }).then(unwrap);
export const fetchCustomers = (signal) =>
  salesClient.get('lookups/customers', { signal }).then(unwrap);
export const fetchSellers = (signal) =>
  salesClient.get('lookups/sellers', { signal }).then(unwrap);
export const fetchInsurances = (signal) =>
  salesClient.get('lookups/insurances', { signal }).then(unwrap);
export const fetchActor = (userId, signal) =>
  salesClient.get('lookups/actor', { params: { userId }, signal }).then(unwrap);
export const fetchEmployees = (role, signal) =>
  salesClient.get('lookups/employees', { params: { role }, signal }).then(unwrap);

// ---- Appointments (customer requests, seller tasks, assignments) --------------
export const fetchAppointments = (params, signal) =>
  salesClient.get('appointments', { params, signal }).then(unwrap);
export const createAppointment = (body) =>
  salesClient.post('appointments', body).then(unwrap);
export const setAppointmentStatus = (id, status) =>
  salesClient.patch(`appointments/${id}/status`, { status }).then(unwrap);
export const assignAppointment = (id, body) =>
  salesClient.patch(`appointments/${id}/assign`, body).then(unwrap);
export const deleteAppointment = (id) =>
  salesClient.delete(`appointments/${id}`).then(() => undefined);

// ---- Orders -------------------------------------------------------------------
export const fetchOrders = (params, signal) =>
  salesClient.get('orders', { params, signal }).then(unwrap);
export const createOrder = (body) => salesClient.post('orders', body).then(unwrap);
export const decideOrder = (id, decision, comment) =>
  salesClient.patch(`orders/${id}/decision`, { decision, comment }).then(unwrap);
