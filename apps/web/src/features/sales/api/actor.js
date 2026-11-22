import { fetchActor } from './salesApi.js';

export async function resolveActor(signal) {
  return fetchActor(signal);
}

// The manager who signs assignments (assignments.assigned_by is required).
export async function resolveManagerId(signal) {
  const actor = await resolveActor(signal);
  if (actor.role !== 'manager' && actor.role !== 'admin')
    throw new Error('บัญชีนี้ไม่มีสิทธิ์จัดสรรงาน');
  if (!actor.employeeId) throw new Error('ไม่พบบัญชีพนักงานที่เชื่อมกับผู้ใช้');
  return actor.employeeId;
}
