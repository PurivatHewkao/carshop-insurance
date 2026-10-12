import { useEffect, useState } from 'react';
import { readHealth } from '../lib/http.js';
import { identityClient } from '../features/identity/api/client.js';
import { catalogClient } from '../features/catalog/api/client.js';
import { salesClient } from '../features/sales/api/client.js';
import { paymentClient } from '../features/payment/api/client.js';
import { reportingClient } from '../features/reporting/api/client.js';
const services = [
  { name: 'identity', client: identityClient },
  { name: 'catalog', client: catalogClient },
  { name: 'sales', client: salesClient },
  { name: 'payment', client: paymentClient },
  { name: 'reporting', client: reportingClient },
];
const initial = () =>
  Object.fromEntries(services.map(({ name }) => [name, 'loading']));
export default function SystemStatusPage() {
  const [statuses, setStatuses] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    for (const { name, client } of services) {
      readHealth(client, name, controller.signal)
        .then(() => {
          if (!controller.signal.aborted)
            setStatuses((current) => ({ ...current, [name]: 'online' }));
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setStatuses((current) => ({ ...current, [name]: 'unavailable' }));
        });
    }
    return () => controller.abort();
  }, [attempt]);
  return (
    <section className="panel">
      <p className="eyebrow">INTEGRATION / LIVENESS</p>
      <h1>System Status</h1>
      <p>
        ตรวจ health ของแต่ละ service โดยไม่เชื่อมฐานข้อมูล สถานะ online
        ไม่ยืนยันว่า business API หรือฐานข้อมูลพร้อมใช้งาน
      </p>
      <div aria-live="polite" className="mt-8 grid gap-3 sm:grid-cols-2">
        {services.map(({ name }) => (
          <div
            className="flex items-center justify-between rounded-xl border border-slate-200 p-5"
            key={name}
          >
            <span className="font-semibold capitalize">{name}</span>
            <span className={'status ' + statuses[name]}>{statuses[name]}</span>
          </div>
        ))}
      </div>
      <button
        className="button mt-6"
        onClick={() => {
          setStatuses(initial());
          setAttempt((value) => value + 1);
        }}
      >
        ตรวจอีกครั้ง
      </button>
    </section>
  );
}
