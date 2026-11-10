// Process-local storage. Replace this module with a database repository later.
const users = new Map();
const emails = new Map();

export function findByEmail(email) {
  return users.get(emails.get(email));
}
export function findById(id) {
  return users.get(id);
}
export function insertUser(user) {
  // Check after password hashing too, so concurrent registrations cannot duplicate.
  if (emails.has(user.email)) return false;
  users.set(user.id, user);
  emails.set(user.email, user.id);
  return true;
}
export function publicUser(user) {
  const { id, name, email, phone, role, status } = user;
  return { id, name, email, phone, role, status };
}
