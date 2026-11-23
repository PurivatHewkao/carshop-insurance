import { useEffect, useState } from 'react';
import { apiErrorMessage } from '../api/catalogApi.js';
import {
  PRODUCTION_STATUS,
  changeProduction,
  fetchProductionLoad,
  fetchProductionQueue,
  formatEtaWindow,
  formatThaiDate,
  saveWeeklyCapacity,
  scheduleProduction,
} from '../api/productionApi.js';
import './production.css';

const FILTERS = [
  '',
  'WAITING',
  'SCHEDULED',
  'IN_PRODUCTION',
  'IN_TRANSIT',
  'READY',
  'DELIVERED',
];
const LOAD_WEEKS = 8;
const addDays = (date, days) =>
  new Date(Date.parse(date + 'T00:00:00Z') + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

// Which step a row offers, and whether it needs an input first.
function nextSteps(status) {
  switch (status) {
    case 'WAITING':
      return [{ action: 'SCHEDULE', label: 'จัดคิวอัตโนมัติ' }];
    case 'SCHEDULED':
      return [
        { action: 'START', label: 'เริ่มผลิต', input: 'vin' },
        { action: 'RESCHEDULE', label: 'เลื่อนคิว', input: 'week' },
      ];
    case 'IN_PRODUCTION':
      return [
        { action: 'SHIP', label: 'ออกจากโรงงาน', input: 'arrival' },
        { action: 'RESCHEDULE', label: 'เลื่อนคิว', input: 'week' },
      ];
    case 'IN_TRANSIT':
      return [{ action: 'ARRIVE', label: 'รถถึงศูนย์' }];
    case 'READY':
      return [{ action: 'DELIVER', label: 'ส่งมอบแล้ว' }];
    default:
      return [];
  }
}

function StepForm({ row, step, busy, onSubmit, onCancel }) {
  const initial =
    step.input === 'week'
      ? addDays(row.buildWeek, 7)
      : step.input === 'arrival'
        ? addDays(today(), 3)
        : '';
  const [value, setValue] = useState(initial);
  const field = {
    vin: {
      label: 'เลขตัวถังจริง (17 หลัก)',
      type: 'text',
      placeholder: 'เช่น JTDKB20U093000001',
    },
    week: { label: 'สัปดาห์ผลิตใหม่ (วันจันทร์)', type: 'date' },
    arrival: { label: 'วันที่รถถึงศูนย์', type: 'date' },
  }[step.input];
  const body =
    step.input === 'vin'
      ? { vin: value }
      : step.input === 'week'
        ? { buildWeek: value }
        : { arrivalDate: value };
  return (
    <form
      className="production-step-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ action: step.action, ...body });
      }}
    >
      <label>
        <span>{field.label}</span>
        <input
          type={field.type}
          value={value}
          placeholder={field.placeholder}
          maxLength={step.input === 'vin' ? 17 : undefined}
          onChange={(event) => setValue(event.target.value)}
          required
          autoFocus
        />
      </label>
      <button type="submit" className="production-btn" disabled={busy}>
        บันทึก
      </button>
      <button
        type="button"
        className="production-btn is-ghost"
        onClick={onCancel}
        disabled={busy}
      >
        ยกเลิก
      </button>
    </form>
  );
}

function LoadTable({ load, onCapacity, busyModel }) {
  const [drafts, setDrafts] = useState({});
  if (!load?.models.length) return null;
  const weeks = load.models[0].weeks.map((w) => w.week);
  return (
    <div className="production-load-wrap">
      <table className="production-load">
        <caption>คิวผลิตต่อสัปดาห์ (จองแล้ว / กำลังผลิตได้)</caption>
        <thead>
          <tr>
            <th scope="col">รุ่น</th>
            <th scope="col">คัน/สัปดาห์</th>
            {weeks.map((week) => (
              <th scope="col" key={week}>
                {formatThaiDate(week)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {load.models.map((model) => (
            <tr key={model.modelId}>
              <th scope="row">{model.modelName}</th>
              <td>
                <input
                  type="number"
                  min="0"
                  max="100"
                  aria-label={'กำลังผลิตต่อสัปดาห์ ' + model.modelName}
                  disabled={busyModel === model.modelId}
                  value={drafts[model.modelId] ?? model.weeklyCapacity}
                  onChange={(event) =>
                    setDrafts((d) => ({
                      ...d,
                      [model.modelId]: event.target.value,
                    }))
                  }
                  onBlur={() => {
                    const draft = drafts[model.modelId];
                    setDrafts((d) => {
                      const next = { ...d };
                      delete next[model.modelId];
                      return next;
                    });
                    if (
                      draft !== undefined &&
                      Number(draft) !== model.weeklyCapacity
                    )
                      onCapacity(model, Number(draft));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                />
              </td>
              {model.weeks.map(({ week, booked }) => {
                const full = booked >= model.weeklyCapacity;
                return (
                  <td
                    key={week}
                    className={full ? 'is-full' : booked ? 'is-busy' : ''}
                  >
                    {booked}/{model.weeklyCapacity}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Stock/admin: made-to-order cars from deposit to delivery (services/catalog /production). */
export default function ProductionQueuePanel() {
  const [filter, setFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({
    key: null,
    rows: [],
    load: null,
    error: '',
  });
  const [open, setOpen] = useState(null); // { carId, action }
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const requestKey = filter + '|' + reloadKey;
  const loading = state.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchProductionQueue(filter, controller.signal),
      fetchProductionLoad(LOAD_WEEKS, controller.signal),
    ]).then(
      ([rows, load]) => setState({ key: requestKey, rows, load, error: '' }),
      (error) => {
        if (!controller.signal.aborted)
          setState({
            key: requestKey,
            rows: [],
            load: null,
            error: apiErrorMessage(error),
          });
      },
    );
    return () => controller.abort();
  }, [filter, requestKey]);

  const reload = () => setReloadKey((key) => key + 1);

  async function run(row, body) {
    setBusy(row.carId);
    try {
      const saved =
        body.action === 'SCHEDULE'
          ? await scheduleProduction(row.carId)
          : await changeProduction(row.carId, body);
      const label = PRODUCTION_STATUS[saved.status]?.label || saved.status;
      setNotice(
        `${row.model.name} (${row.order?.customerName || 'ไม่มีออเดอร์'}): ${label}` +
          (saved.etaFrom
            ? ' · รับรถ ' + formatEtaWindow(saved.etaFrom, saved.etaTo)
            : ''),
      );
      setOpen(null);
      reload();
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  }

  async function updateCapacity(model, capacity) {
    setBusy(model.modelId);
    try {
      await saveWeeklyCapacity(model.modelId, capacity);
      setNotice(`${model.modelName}: ผลิตได้ ${capacity} คันต่อสัปดาห์`);
      reload();
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <section
      className="catalog-admin-panel production-panel"
      aria-labelledby="production-title"
    >
      <div className="catalog-admin-panel-head">
        <div>
          <p className="catalog-eyebrow">PRODUCTION QUEUE</p>
          <h2 id="production-title">คิวผลิตรถสั่งทำ</h2>
        </div>
        <span className="catalog-number-tag">{state.rows.length} คัน</span>
      </div>
      <p className="production-help">
        จัดคิวได้เมื่อออเดอร์อนุมัติและจ่ายเงินจองแล้ว
        ระบบเลือกสัปดาห์แรกที่ยังว่างหลังรอชิ้นส่วน (Eco 14 วัน, Balanced 21
        วัน, High Performance 35 วัน) ช่วงรับรถ = สัปดาห์ผลิต + 7 ถึง 14 วัน
      </p>
      {notice && (
        <div className="catalog-form-feedback" role="status">
          {notice}
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="ปิดข้อความ"
          >
            ×
          </button>
        </div>
      )}
      {state.error && (
        <div className="catalog-form-feedback" role="alert">
          {state.error}
          <button type="button" onClick={reload} aria-label="ลองโหลดใหม่">
            ↻
          </button>
        </div>
      )}

      <LoadTable
        load={state.load}
        onCapacity={updateCapacity}
        busyModel={busy}
      />

      <div
        className="production-filters"
        role="group"
        aria-label="กรองตามสถานะ"
      >
        {FILTERS.map((status) => (
          <button
            type="button"
            key={status || 'all'}
            className={filter === status ? 'is-active' : ''}
            aria-pressed={filter === status}
            onClick={() => setFilter(status)}
          >
            {status ? PRODUCTION_STATUS[status].label : 'ทั้งหมด'}
          </button>
        ))}
      </div>

      <div className="catalog-stock-table-wrap">
        <table className="catalog-stock-table production-table">
          <thead>
            <tr>
              <th>รถ</th>
              <th>ลูกค้า / ออเดอร์</th>
              <th>สถานะ</th>
              <th>สัปดาห์ผลิต</th>
              <th>ช่วงรับรถ</th>
              <th>ขั้นต่อไป</th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row) => {
              const status = PRODUCTION_STATUS[row.status] || {
                label: row.status,
                tone: '',
              };
              const steps = nextSteps(row.status);
              const formStep =
                open?.carId === row.carId &&
                steps.find((s) => s.action === open.action);
              return (
                <tr key={row.carId}>
                  <td>
                    <strong>{row.model.name}</strong>
                    <small className="production-sub">
                      สี {row.color} · {row.vin}
                    </small>
                  </td>
                  <td>
                    {row.order ? (
                      <>
                        <strong>{row.order.customerName}</strong>
                        <small className="production-sub">
                          ORD-{row.order.id.slice(0, 8).toUpperCase()} ·{' '}
                          {row.order.status}
                        </small>
                      </>
                    ) : (
                      <small className="production-sub">
                        ไม่มีออเดอร์ที่ใช้งานอยู่
                      </small>
                    )}
                  </td>
                  <td>
                    <span className={`catalog-status-chip ${status.tone}`}>
                      <i />
                      {status.label}
                    </span>
                  </td>
                  <td>{formatThaiDate(row.buildWeek)}</td>
                  <td>
                    {row.status === 'READY' || row.status === 'DELIVERED'
                      ? 'ถึง ' + formatThaiDate(row.readyDate)
                      : formatEtaWindow(row.etaFrom, row.etaTo)}
                    {row.delayDays > 0 && (
                      <small
                        className={
                          'production-delay' +
                          (row.delayDays > 30 ? ' is-late' : '')
                        }
                      >
                        ล่าช้า {row.delayDays} วัน
                        {row.delayDays > 30 ? ' · ลูกค้ายกเลิกได้' : ''}
                      </small>
                    )}
                  </td>
                  <td>
                    {formStep ? (
                      <StepForm
                        row={row}
                        step={formStep}
                        busy={busy === row.carId}
                        onSubmit={(body) => run(row, body)}
                        onCancel={() => setOpen(null)}
                      />
                    ) : (
                      <div className="production-actions">
                        {steps.map((step) => (
                          <button
                            type="button"
                            key={step.action}
                            className={
                              step.action === 'RESCHEDULE'
                                ? 'production-btn is-ghost'
                                : 'production-btn'
                            }
                            disabled={busy === row.carId}
                            onClick={() =>
                              step.input
                                ? setOpen({
                                    carId: row.carId,
                                    action: step.action,
                                  })
                                : run(row, { action: step.action })
                            }
                          >
                            {step.label}
                          </button>
                        ))}
                        {!steps.length && (
                          <small className="production-sub">–</small>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && !state.error && (
          <div className="catalog-empty-inline">กำลังโหลดคิวผลิต...</div>
        )}
        {!loading && !state.error && !state.rows.length && (
          <div className="catalog-empty-inline">
            ยังไม่มีรถสั่งผลิตในสถานะนี้
          </div>
        )}
      </div>
    </section>
  );
}
