import { useEffect, useMemo, useState } from 'react';
import { readHealth } from '../lib/http.js';
import { identityClient } from '../features/identity/api/client.js';
import { catalogClient } from '../features/catalog/api/client.js';
import { salesClient } from '../features/sales/api/client.js';
import { paymentClient } from '../features/payment/api/client.js';
import { reportingClient } from '../features/reporting/api/client.js';
import { API_CATALOG, ROLES } from './apiCatalog.js';
import './SystemStatusPage.css';

const services = [
  { name: 'identity', label: 'บัญชีผู้ใช้และสิทธิ์', client: identityClient },
  { name: 'catalog', label: 'รถยนต์และสต็อก', client: catalogClient },
  { name: 'sales', label: 'งานขายและนัดหมาย', client: salesClient },
  { name: 'payment', label: 'การเงินและชำระเงิน', client: paymentClient },
  { name: 'reporting', label: 'รายงานและ Dashboard', client: reportingClient },
];

const STATUS_TEXT = {
  loading: 'กำลังตรวจ',
  online: 'ออนไลน์',
  unavailable: 'ติดต่อไม่ได้',
};

const METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
const ROLE_LABEL = Object.fromEntries(ROLES);
const AUTO_REFRESH_MS = 30000;

const allApis = services.flatMap(({ name }) =>
  API_CATALOG[name].map(([method, path, description, roles, note]) => ({
    service: name, method, path, description, roles, note,
  })),
);

const initial = () =>
  Object.fromEntries(services.map(({ name }) => [name, { state: 'loading' }]));

function useHealth() {
  const [statuses, setStatuses] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  const [checkedAt, setCheckedAt] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const checks = services.map(({ name, client }) => {
      const started = performance.now();
      return readHealth(client, name, controller.signal)
        .then(() => ({ state: 'online', ms: Math.round(performance.now() - started) }))
        .catch(() => ({ state: 'unavailable' }))
        .then((result) => {
          if (!controller.signal.aborted)
            setStatuses((current) => ({ ...current, [name]: result }));
        });
    });
    Promise.all(checks).then(() => {
      if (!controller.signal.aborted) setCheckedAt(new Date());
    });
    const timer = setTimeout(() => setAttempt((value) => value + 1), AUTO_REFRESH_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [attempt]);

  const recheck = () => {
    setStatuses(initial());
    setAttempt((value) => value + 1);
  };
  return { statuses, checkedAt, recheck };
}

function Chip({ active, onClick, children, count }) {
  return (
    <button type="button" className={'ss-chip' + (active ? ' on' : '')} aria-pressed={active} onClick={onClick}>
      {children}
      {count != null && <span className="ss-count">{count}</span>}
    </button>
  );
}

export default function SystemStatusPage() {
  const { statuses, checkedAt, recheck } = useHealth();
  const [role, setRole] = useState('all');
  const [service, setService] = useState('all');
  const [method, setMethod] = useState('all');
  const [search, setSearch] = useState('');

  const values = Object.values(statuses);
  const checking = values.some((item) => item.state === 'loading');
  const onlineCount = values.filter((item) => item.state === 'online').length;

  // นับจำนวน API ต่อ role ตามตัวกรอง service/method ที่เลือกอยู่
  const scoped = useMemo(
    () => allApis.filter((api) =>
      (service === 'all' || api.service === service) && (method === 'all' || api.method === method)),
    [service, method],
  );
  const query = search.trim().toLowerCase();
  const shown = scoped.filter((api) =>
    (role === 'all' || api.roles.includes(role)) &&
    (!query || `${api.path} ${api.description} ${api.note || ''}`.toLowerCase().includes(query)));

  const resetFilters = () => {
    setRole('all');
    setService('all');
    setMethod('all');
    setSearch('');
  };

  return (
    <section className="panel ss-page">
      <p className="eyebrow">INTEGRATION / LIVENESS</p>
      <h1>สถานะระบบ (System Status)</h1>
      <p>
        ตรวจ health ของแต่ละ service และดูว่า API แต่ละเส้นเปิดให้ role ไหนเรียกได้บ้าง
        สถานะออนไลน์ไม่ได้ยืนยันว่า business API หรือฐานข้อมูลพร้อมใช้งาน
      </p>

      <div className="ss-summary" aria-live="polite">
        <span className={'status ' + (checking ? 'loading' : onlineCount === services.length ? 'online' : 'unavailable')}>
          {checking ? 'กำลังตรวจสอบ…' : `ออนไลน์ ${onlineCount}/${services.length} services`}
        </span>
        {checkedAt && (
          <span className="ss-muted">
            ตรวจล่าสุด {checkedAt.toLocaleTimeString('th-TH')} · ตรวจซ้ำอัตโนมัติทุก 30 วินาที
          </span>
        )}
        <button className="s-btn sm ss-recheck" disabled={checking} onClick={recheck}>
          {checking ? 'กำลังตรวจ…' : 'ตรวจอีกครั้ง'}
        </button>
      </div>

      <div className="ss-health">
        {services.map(({ name, label, client }) => {
          const { state, ms } = statuses[name];
          const active = service === name;
          return (
            <button
              type="button"
              key={name}
              className={'ss-svc' + (active ? ' on' : '')}
              aria-pressed={active}
              onClick={() => setService(active ? 'all' : name)}
              title="กดเพื่อกรองเฉพาะ API ของ service นี้"
            >
              <span className="ss-svc-top">
                <span className="ss-svc-name">{name}</span>
                <span className={'status ' + state}>
                  {STATUS_TEXT[state]}
                  {state === 'online' && ms != null ? ` · ${ms} ms` : ''}
                </span>
              </span>
              <span className="ss-muted">{label} · {API_CATALOG[name].length} API</span>
              <span className="ss-url">{client.defaults.baseURL}</span>
            </button>
          );
        })}
      </div>

      {!checking && onlineCount < services.length && (
        <div className="notice" role="alert">
          <strong>มี service ที่ติดต่อไม่ได้</strong>
          <p className="mt-1" style={{ color: 'inherit' }}>
            ตรวจว่ารัน service นั้นอยู่ (เช่น <code>npm run dev:reporting</code>) และ URL ใน
            <code> apps/web/.env</code> ถูกต้อง
          </p>
        </div>
      )}

      <h2 className="ss-h2">API ทั้งหมดแยกตาม role</h2>
      <div className="ss-filters">
        <div className="ss-row" role="group" aria-label="กรองตาม role">
          <span className="ss-label">Role</span>
          <Chip active={role === 'all'} onClick={() => setRole('all')} count={scoped.length}>ทั้งหมด</Chip>
          {ROLES.map(([key, label]) => (
            <Chip key={key} active={role === key} onClick={() => setRole(key)} count={scoped.filter((api) => api.roles.includes(key)).length}>
              <span className={'ss-dot r-' + key} aria-hidden="true" />{label}
            </Chip>
          ))}
        </div>
        <div className="ss-row" role="group" aria-label="กรองตาม service">
          <span className="ss-label">Service</span>
          <Chip active={service === 'all'} onClick={() => setService('all')}>ทั้งหมด</Chip>
          {services.map(({ name }) => (
            <Chip key={name} active={service === name} onClick={() => setService(name)}>{name}</Chip>
          ))}
        </div>
        <div className="ss-row" role="group" aria-label="กรองตาม method">
          <span className="ss-label">Method</span>
          <Chip active={method === 'all'} onClick={() => setMethod('all')}>ทั้งหมด</Chip>
          {METHODS.map((item) => (
            <Chip key={item} active={method === item} onClick={() => setMethod(item)}>{item}</Chip>
          ))}
        </div>
        <div className="ss-row">
          <label className="ss-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">ค้นหา API</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหา path หรือคำอธิบาย เช่น invoices, นัดหมาย" />
          </label>
          <span className="ss-muted">แสดง {shown.length} จาก {allApis.length} API</span>
          {(role !== 'all' || service !== 'all' || method !== 'all' || search) && (
            <button type="button" className="ss-clear" onClick={resetFilters}>ล้างตัวกรอง</button>
          )}
        </div>
      </div>

      {services
        .filter(({ name }) => shown.some((api) => api.service === name))
        .map(({ name, label, client }) => {
          const rows = shown.filter((api) => api.service === name);
          const { state } = statuses[name];
          return (
            <section className="ss-group" key={name}>
              <header className="ss-group-h">
                <h3>{name}</h3>
                <span className="ss-muted">{label}</span>
                <span className={'status ' + state}>{STATUS_TEXT[state]}</span>
                <span className="ss-url ss-group-url">{client.defaults.baseURL}</span>
              </header>
              <div className="ss-tw">
                <table className="ss-tbl">
                  <thead>
                    <tr>
                      <th scope="col">Method</th>
                      <th scope="col">Path</th>
                      <th scope="col">ใช้ทำอะไร</th>
                      <th scope="col">Role ที่เรียกได้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((api) => (
                      <tr key={api.method + api.path}>
                        <td><span className={'ss-method m-' + api.method.toLowerCase()}>{api.method}</span></td>
                        <td><code className="ss-path">{api.path}</code></td>
                        <td>
                          {api.description}
                          {api.note && <span className="ss-note">{api.note}</span>}
                        </td>
                        <td>
                          <span className="ss-roles">
                            {api.roles.length === ROLES.length ? (
                              <span className="ss-role r-all">ทุกคน</span>
                            ) : (
                              api.roles.map((key) => (
                                <span key={key} className={'ss-role r-' + key + (role === key ? ' hit' : '')}>
                                  {ROLE_LABEL[key]}
                                </span>
                              ))
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

      {!shown.length && (
        <p className="ss-empty">
          ไม่พบ API ที่ตรงกับตัวกรอง <button type="button" className="ss-clear" onClick={resetFilters}>ล้างตัวกรอง</button>
        </p>
      )}

      <p className="ss-muted ss-foot">
        รายการ API มาจาก <code>apps/web/src/pages/apiCatalog.js</code> (อ่านจาก routes ของแต่ละ service)
        ถ้าเพิ่มหรือเปลี่ยนสิทธิ์ route ให้แก้ไฟล์นี้ตามด้วย
      </p>
    </section>
  );
}
