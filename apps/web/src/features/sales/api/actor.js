import { getSession } from '../../identity/api/auth.js';
import { fetchActor, fetchEmployees } from './salesApi.js';

// "Who is using the page?" The Identity service has no backend yet, so the web
// session holds demo ids that are not database ids. Until Identity returns real
// UUID users, pages fall back to a stand-in picked from the database
// (isStandIn: true) and show a selector. A real UUID session id is resolved
// through GET /lookups/actor and needs no selector.
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveActor(signal) {
  const session = getSession();
  if (session && UUID.test(String(session.id))) {
    try {
      const actor = await fetchActor(session.id, signal);
      return { ...actor, isStandIn: false };
    } catch (error) {
      if (error?.response?.status !== 404) throw error;
    }
  }
  return { customerId: null, employeeId: null, isStandIn: true };
}

// The manager who signs assignments (assignments.assigned_by is required).
export async function resolveManagerId(signal) {
  const actor = await resolveActor(signal);
  if (actor.employeeId && !actor.isStandIn) return actor.employeeId;
  const managers = await fetchEmployees('MANAGER', signal);
  if (!managers[0])
    throw new Error('ยังไม่มีพนักงานตำแหน่ง Manager ในฐานข้อมูล');
  return managers[0].id;
}
