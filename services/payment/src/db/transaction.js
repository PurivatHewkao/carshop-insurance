import { getMysqlPool } from '../config/mysql.js';

/** Run fn(connection) inside one MySQL transaction; rolls back on any error. */
export async function withTransaction(fn) {
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // keep the original error
    }
    throw error;
  } finally {
    connection.release();
  }
}

export function query(sql, params) {
  return getMysqlPool().query(sql, params);
}
