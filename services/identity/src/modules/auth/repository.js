import { randomUUID } from 'node:crypto';
import { getMysqlPool } from '../../config/mysql.js';
import { fail } from './validation.js';

const selection = `SELECT u.*, COALESCE(NULLIF(CONCAT_WS(' ',c.first_name,NULLIF(c.last_name,'')),''),NULLIF(CONCAT_WS(' ',e.first_name,NULLIF(e.last_name,'')),''),u.username) AS name,
 COALESCE(c.phone_number,e.phone_number,'') AS phone FROM users u
 LEFT JOIN customers c ON c.user_id=u.id LEFT JOIN employees e ON e.user_id=u.id`;
function decode(row) {
  if (!row) return undefined;
  const [, salt, passwordHash] = row.password_hash.split('$');
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role.toLowerCase(),
    status: row.status.toLowerCase(),
    salt,
    passwordHash,
    encodedPassword: row.password_hash,
  };
}
export async function findByEmail(email, db = getMysqlPool()) {
  const [rows] = await db.execute(`${selection} WHERE u.email=?`, [email]);
  return decode(rows[0]);
}
export async function findById(id, db = getMysqlPool()) {
  const [rows] = await db.execute(`${selection} WHERE u.id=?`, [id]);
  return decode(rows[0]);
}
export async function transaction(action) {
  const db = await getMysqlPool().getConnection();
  try {
    await db.beginTransaction();
    const result = await action(db);
    await db.commit();
    return result;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}
async function saveDetails(db, user) {
  if (user.role === 'customer') {
    await db.execute(
      `INSERT INTO customers (id,user_id,first_name,last_name,phone_number,email) VALUES (?,?,?,'',?,?)
      ON DUPLICATE KEY UPDATE first_name=VALUES(first_name),last_name='',phone_number=VALUES(phone_number),email=VALUES(email)`,
      [randomUUID(), user.id, user.name, user.phone, user.email],
    );
  } else {
    await db.execute(
      `INSERT INTO employees (id,user_id,first_name,last_name,phone_number) VALUES (?,?,?,'',?)
      ON DUPLICATE KEY UPDATE first_name=VALUES(first_name),last_name='',phone_number=VALUES(phone_number)`,
      [randomUUID(), user.id, user.name, user.phone],
    );
  }
  // Preserve both domain records and their IDs if the user changes role.
  await db.execute(
    "UPDATE customers SET first_name=?,last_name='',phone_number=? WHERE user_id=?",
    [user.name, user.phone, user.id],
  );
  await db.execute(
    "UPDATE employees SET first_name=?,last_name='',phone_number=? WHERE user_id=?",
    [user.name, user.phone, user.id],
  );
}
export async function insertUser(user, connection) {
  const insert = async (db) => {
    await db.execute(
      'INSERT INTO users (id,username,email,password_hash,role,status) VALUES (?,?,?,?,?,?)',
      [
        user.id,
        user.id,
        user.email,
        `scrypt$${user.salt}$${user.passwordHash}`,
        user.role.toUpperCase(),
        user.status.toUpperCase(),
      ],
    );
    await saveDetails(db, user);
    return true;
  };
  try {
    return connection ? await insert(connection) : await transaction(insert);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return false;
    throw error;
  }
}
export async function listUsers() {
  const [rows] = await getMysqlPool().query(
    `${selection} ORDER BY u.created_at,u.id`,
  );
  return rows.map(decode).map(publicUser);
}
export async function updateProfile(id, details) {
  return transaction(async (db) => {
    await db.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [id]);
    const user = await findById(id, db);
    if (!user) fail(404, 'NOT_FOUND', 'ไม่พบผู้ใช้');
    Object.assign(user, details);
    await saveDetails(db, user);
    return publicUser(user);
  });
}
export async function lockAdministration(db) {
  await db.query('SELECT id FROM identity_admin_lock WHERE id=1 FOR UPDATE');
}
export async function assertAdmin(id, db = getMysqlPool()) {
  const user = await findById(id, db);
  if (user?.role !== 'admin' || user.status !== 'active')
    fail(403, 'FORBIDDEN', 'เฉพาะผู้ดูแลระบบเท่านั้น');
}
export async function changeUser(actorId, id, values) {
  return transaction(async (db) => {
    await lockAdministration(db);
    await assertAdmin(actorId, db);
    if (actorId === id)
      fail(403, 'SELF_UPDATE', 'ไม่สามารถแก้สิทธิ์บัญชีตนเอง');
    const user = await findById(id, db);
    if (!user) fail(404, 'NOT_FOUND', 'ไม่พบผู้ใช้');
    if (
      user.role === 'admin' &&
      user.status === 'active' &&
      (values.role !== 'admin' || values.status !== 'active')
    ) {
      const [[{ count }]] = await db.query(
        "SELECT COUNT(*) AS count FROM users WHERE role='ADMIN' AND status='ACTIVE'",
      );
      if (count <= 1)
        fail(
          409,
          'LAST_ADMIN',
          'ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อยหนึ่งคน',
        );
    }
    await db.execute('UPDATE users SET role=?,status=? WHERE id=?', [
      values.role.toUpperCase(),
      values.status.toUpperCase(),
      id,
    ]);
    await saveDetails(db, { ...user, ...values });
    return publicUser(await findById(id, db));
  });
}
export async function isRevoked(id) {
  const [rows] = await getMysqlPool().execute(
    'SELECT jti FROM identity_revoked_tokens WHERE jti=?',
    [id],
  );
  return rows.length > 0;
}
export async function revoke(claims) {
  await getMysqlPool().execute(
    'INSERT IGNORE INTO identity_revoked_tokens (jti,expires_at) VALUES (?,?)',
    [claims.jti, claims.exp],
  );
  await getMysqlPool().execute(
    'DELETE FROM identity_revoked_tokens WHERE expires_at<=?',
    [Math.floor(Date.now() / 1000)],
  );
}
export function publicUser(user) {
  const { id, name, email, phone, role, status } = user;
  return { id, name, email, phone, role, status };
}
