import { useEffect, useState } from 'react';
import { readHealth } from '../lib/http.js';
import { identityClient } from '../features/identity/api/client.js';
import { catalogClient } from '../features/catalog/api/client.js';
import { salesClient } from '../features/sales/api/client.js';
import { paymentClient } from '../features/payment/api/client.js';
import { reportingClient } from '../features/reporting/api/client.js';

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

const AUTO_REFRESH_MS = 30000;

const initial = () =>
  Object.fromEntries(services.map(({ name }) => [name, { state: 'loading' }]));

export default function SystemStatusPage() {
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

  const values = Object.values(statuses);
  const checking = values.some((item) => item.state === 'loading');
  const onlineCount = values.filter((item) => item.state === 'online').length;

  return (
    <section className="panel">
      <p className="eyebrow">INTEGRATION / LIVENESS</p>
      <h1>สถานะระบบ (System Status)</h1>
      <p>
        ตรวจ health ของแต่ละ service โดยไม่เชื่อมฐานข้อมูล สถานะออนไลน์
        ไม่ได้ยืนยันว่า business API หรือฐานข้อมูลพร้อมใช้งาน
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3" aria-live="polite">
        <span className={'status ' + (checking ? 'loading' : onlineCount === services.length ? 'online' : 'unavailable')}>
          {checking ? 'กำลังตรวจสอบ…' : `ออนไลน์ ${onlineCount}/${services.length} services`}
        </span>
        {checkedAt && (
          <span className="text-xs" style={{ color: 'var(--mute)' }}>
            ตรวจล่าสุด {checkedAt.toLocaleTimeString('th-TH')} · ตรวจซ้ำอัตโนมัติทุก 30 วินาที
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {services.map(({ name, label, client }) => {
          const { state, ms } = statuses[name];
          return (
            <div className="status-card" key={name}>
              <div className="min-w-0">
                <span className="font-semibold capitalize">{name}</span>
                <span className="meta">{label}</span>
                <span className="meta break-all">{client.defaults.baseURL}</span>
              </div>
              <span className={'status shrink-0 ' + state}>
                {STATUS_TEXT[state]}
                {state === 'online' && ms != null ? ` · ${ms} ms` : ''}
              </span>
            </div>
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

      <button
        className="button mt-6"
        disabled={checking}
        onClick={() => {
          setStatuses(initial());
          setAttempt((value) => value + 1);
        }}
      >
        {checking ? 'กำลังตรวจ…' : 'ตรวจอีกครั้ง'}
      </button>
    </section>
  );
}
