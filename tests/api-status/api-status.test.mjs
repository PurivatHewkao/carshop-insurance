// ตัวเช็คสถานะระบบแบบยิง API จริง (Mocha)
//
//   npm run test:status                    ทุก service
//   npm run test:status -- --grep reporting   เฉพาะ service ที่ชื่อตรง
//
// รายการ API และ role ที่เรียกได้มาจาก apps/web/src/pages/apiCatalog.js (ไฟล์เดียวกับหน้า System Status)
// ทุกครั้งที่รันจะยิง request จริงไปที่ service (ไม่มี mock) แล้วตรวจว่า
//   1. /health ของทุก service ตอบ 200 { service, status: 'ok' }
//   2. API ที่ต้องล็อกอิน: ไม่ส่ง session → 401
//   3. GET: role ที่มีสิทธิ์ → ได้ข้อมูล (2xx) / role ที่ไม่มีสิทธิ์ → 403
//   4. POST/PATCH/PUT/DELETE: ยิงแบบไม่ล็อกอินเท่านั้น (ต้องได้ 401 หรือ 400) — ไม่เขียนข้อมูลจริง
//      เพราะ .env ของทีมชี้ฐานข้อมูล Railway
// ผลล่าสุดเขียนไว้ที่ apps/web/public/api-status.json ให้หน้า /system-status แสดง
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_CATALOG, ROLES } from '../../apps/web/src/pages/apiCatalog.js';

const root = new URL('../../', import.meta.url);
const SERVICES = ['identity', 'catalog', 'sales', 'payment', 'reporting'];
const DEFAULT_PORTS = { identity: 3001, catalog: 3002, sales: 3003, payment: 3004, reporting: 3005 };
const SIGNED_IN_ROLES = ROLES.map(([role]) => role).filter((role) => role !== 'guest');
// id ที่ไม่มีอยู่จริง ใช้แทน :id ใน path (ต้องได้ 404/400 ไม่ใช่ 500)
const MISSING_ID = '00000000-0000-4000-8000-000000000000';
// GET ที่ต้องมี query ถึงจะตอบ 200 ได้: ถือว่าผ่านเมื่อได้ 400/404 ด้วย
const NEEDS_QUERY = new Set(['catalog GET /production/eta']);
const TIMEOUT_MS = Number(process.env.STATUS_TIMEOUT_MS || 20000);

/** อ่าน KEY=value จาก .env แบบง่าย (ไม่ทับค่าที่ตั้งใน environment แล้ว) */
function readEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(new URL(path, root), 'utf8')
        .split(/\r?\n/)
        .map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line))
        .filter(Boolean)
        .map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')]),
    );
  } catch {
    return {};
  }
}
const fileEnv = readEnvFile('apps/web/.env');
const setting = (key) => process.env[key] ?? fileEnv[key];

const baseUrl = (service) =>
  (setting(`STATUS_${service.toUpperCase()}_URL`) ||
    setting(`VITE_${service.toUpperCase()}_API_URL`) ||
    `http://localhost:${DEFAULT_PORTS[service]}/api/v1`).replace(/\/$/, '');
const ORIGIN = setting('STATUS_ORIGIN') || 'http://localhost:5173';

/** บัญชีทดสอบต่อ role: STATUS_ACCOUNT_<ROLE>=email:password หรือ role-<role>@carshop.test + ROLE_TEST_PASSWORD */
function accountFor(role) {
  const custom = setting(`STATUS_ACCOUNT_${role.toUpperCase()}`);
  if (custom) {
    const at = custom.indexOf(':');
    return { email: custom.slice(0, at), password: custom.slice(at + 1) };
  }
  const password = setting('ROLE_TEST_PASSWORD') || setting('VITE_IDENTITY_ROLE_TEST_PASSWORD');
  return password ? { email: `role-${role}@carshop.test`, password } : null;
}

async function call(service, method, path, { token, body } = {}) {
  const headers = { accept: 'application/json', origin: ORIGIN };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const started = performance.now();
  const response = await fetch(baseUrl(service) + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // PDF หรือข้อความธรรมดา
  }
  return { status: response.status, json, ms: Math.round(performance.now() - started) };
}

const describeStatus = (res) => `HTTP ${res.status}${res.json?.error?.code ? ` ${res.json.error.code}` : ''}`;
const fillPath = (path) => path.replace(/:[A-Za-z]+/g, MISSING_ID);

// ---- เก็บผลไว้ให้หน้า System Status -------------------------------------------
const results = [];
const tokens = {};
const loginErrors = {};

function record(entry) {
  results.push({ ...entry, checkedAt: new Date().toISOString() });
}

/** it() ที่บันทึกผลของ API นั้นด้วย (ผ่าน/ไม่ผ่าน + HTTP status ที่ได้จริง) */
function check(title, meta, run) {
  it(title, async function () {
    let last;
    try {
      await run.call(this, (res) => {
        last = res;
        return res;
      });
      record({ ...meta, pass: true, status: last?.status ?? null, ms: last?.ms ?? null });
    } catch (error) {
      if (error?.constructor?.name === 'Pending') throw error; // this.skip()
      record({ ...meta, pass: false, status: last?.status ?? null, error: String(error?.message || error).split('\n')[0] });
      throw error;
    }
  });
}

after(function () {
  const out = new URL('apps/web/public/api-status.json', root);
  mkdirSync(dirname(fileURLToPath(out)), { recursive: true });
  const passed = results.filter((item) => item.pass).length;
  writeFileSync(
    out,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        origin: ORIGIN,
        baseUrls: Object.fromEntries(SERVICES.map((service) => [service, baseUrl(service)])),
        rolesTested: Object.keys(tokens),
        rolesSkipped: SIGNED_IN_ROLES.filter((role) => !tokens[role]).map((role) => ({ role, reason: loginErrors[role] || 'ไม่ได้ตั้งรหัสผ่านบัญชีทดสอบ' })),
        total: results.length,
        passed,
        failed: results.length - passed,
        results,
      },
      null,
      2,
    ) + '\n',
  );
});

// ---- 1. health ----------------------------------------------------------------
describe('health ของทุก service', function () {
  this.timeout(TIMEOUT_MS);
  for (const service of SERVICES) {
    check(`${service} GET /health ตอบ 200`, { service, method: 'GET', path: '/health', role: 'guest' }, async (seen) => {
      const res = seen(await call(service, 'GET', '/health'));
      assert.equal(res.status, 200, describeStatus(res));
      assert.deepEqual(res.json, { service, status: 'ok' });
    });
  }
});

// ---- 2. login ทุก role ที่มีบัญชีทดสอบ ----------------------------------------
describe('เข้าสู่ระบบด้วยบัญชีทดสอบแต่ละ role', function () {
  this.timeout(TIMEOUT_MS);
  for (const role of SIGNED_IN_ROLES) {
    it(`login เป็น ${role}`, async function () {
      const account = accountFor(role);
      if (!account) {
        loginErrors[role] = 'ไม่ได้ตั้ง ROLE_TEST_PASSWORD หรือ STATUS_ACCOUNT_' + role.toUpperCase();
        this.skip();
      }
      const res = await call('identity', 'POST', '/auth/login', { body: account });
      if (res.status !== 200) loginErrors[role] = `login ไม่สำเร็จ (${describeStatus(res)})`;
      assert.equal(res.status, 200, `${account.email}: ${describeStatus(res)}`);
      assert.equal(res.json?.data?.user?.role, role, 'บัญชีนี้ไม่ใช่ role ' + role);
      tokens[role] = res.json.data.accessToken;
      assert.ok(tokens[role], 'ไม่ได้ accessToken');
    });
  }
});

// ---- 3. API ทุกเส้นตาม apiCatalog.js -------------------------------------------
for (const service of SERVICES) {
  describe(`${service} API`, function () {
    this.timeout(TIMEOUT_MS);
    for (const [method, path, description, roles] of API_CATALOG[service]) {
      if (path === '/health') continue;
      const target = fillPath(path);
      const meta = { service, method, path };
      const isPublic = roles.includes('guest');

      if (method !== 'GET') {
        // เขียนข้อมูล: ยิงแบบไม่ล็อกอินและ body ว่างเท่านั้น
        const expected = isPublic ? [400, 422] : [401];
        check(`${method} ${path} (${description}) ไม่ล็อกอิน → ${expected.join('/')}`, { ...meta, role: 'guest' }, async (seen) => {
          const res = seen(await call(service, method, target, { body: {} }));
          assert.ok(expected.includes(res.status), `ได้ ${describeStatus(res)}`);
        });
        continue;
      }

      const acceptsMissing = path.includes(':') || NEEDS_QUERY.has(`${service} ${method} ${path}`);
      const assertAllowed = (res) => {
        const ok = (res.status >= 200 && res.status < 300) || (acceptsMissing && [400, 404].includes(res.status));
        assert.ok(ok, `ควรได้ข้อมูล แต่ได้ ${describeStatus(res)}`);
      };

      check(`GET ${path} (${description}) ไม่ล็อกอิน → ${isPublic ? 'ได้ข้อมูล' : '401'}`, { ...meta, role: 'guest' }, async (seen) => {
        const res = seen(await call(service, 'GET', target));
        if (isPublic) assertAllowed(res);
        else assert.equal(res.status, 401, describeStatus(res));
      });

      for (const role of SIGNED_IN_ROLES) {
        const allowed = roles.includes(role);
        check(`GET ${path} เป็น ${role} → ${allowed ? 'ได้ข้อมูล' : '403'}`, { ...meta, role }, async function (seen) {
          if (!tokens[role]) this.skip();
          const res = seen(await call(service, 'GET', target, { token: tokens[role] }));
          if (allowed) assertAllowed(res);
          else assert.equal(res.status, 403, describeStatus(res));
        });
      }
    }
  });
}
