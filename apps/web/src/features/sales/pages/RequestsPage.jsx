import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import design from '../../../design/toyoty.json';
import { Details, Pill } from '../../../components/common/Showroom.jsx';
const page = design.roles[1].pages[0];
const cars = design.roles[0].pages[1].blocks[2].items;
const initialRows = page.blocks[3].rows.map((row, i) => ({
  id: 'sample-' + i,
  car: row[0],
  type: row[1],
  date: row[2],
  status: row[3],
}));
const storageKey = 'toyoty-demo-requests';
function loadRows() {
  try {
    const rows = JSON.parse(sessionStorage.getItem(storageKey));
    return Array.isArray(rows) &&
      rows.every(
        (row) =>
          row &&
          ['id', 'car', 'type', 'date', 'status'].every(
            (key) => typeof row[key] === 'string',
          ),
      )
      ? rows
      : initialRows;
  } catch {
    return initialRows;
  }
}
export default function RequestsPage() {
  const [params] = useSearchParams();
  return <RequestForm key={params.toString()} params={params} />;
}
function RequestForm({ params }) {
  const [type, setType] = useState(
    ['สนใจ', 'จอง', 'นัดดูรถ'].includes(params.get('type'))
      ? params.get('type')
      : 'สนใจ',
  );
  const [rows, setRows] = useState(loadRows);
  const [message, setMessage] = useState('');
  const today = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok',
  });
  function save(next) {
    setRows(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get('date') || '–');
    if (date !== '–' && date < today) {
      setMessage('กรุณาเลือกวันที่วันนี้หรือในอนาคต');
      return;
    }
    const persisted = save([
      {
        id: crypto.randomUUID(),
        car: String(form.get('car')),
        type,
        date,
        time: String(form.get('time') || ''),
        note: String(form.get('note') || ''),
        insurance: form.get('insurance') === 'on',
        configuration: String(form.get('configuration') || ''),
        status: 'รอ Admin',
      },
      ...rows,
    ]);
    setMessage(
      persisted
        ? 'บันทึกคำขอตัวอย่างในเบราว์เซอร์แล้ว ยังไม่ได้ส่งถึงทีมขาย'
        : 'เพิ่มคำขอตัวอย่างแล้ว แต่เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูลเมื่อรีเฟรช',
    );
  }
  return (
    <div className="page-content">
      <header className="s-ph">
        <div>
          <p className="s-crumb">บัญชีลูกค้า / ส่งคำขอ</p>
          <h1>ส่งคำขอ</h1>
          <p>{page.sub}</p>
        </div>
      </header>
      <p className="s-note">
        โหมดสาธิต · คำขอเก็บเฉพาะแท็บนี้ ยังไม่เชื่อมระบบบัญชีหรือส่งถึงทีมขาย
      </p>
      <div className="s-steps">
        {page.blocks[0].items.map((step, i) => (
          <div key={step} className={'s-step ' + (i === 0 ? 'cur' : '')}>
            <span className="dot">{i + 1}</span>
            {step}
          </div>
        ))}
      </div>
      <div className="request-columns">
        <section className="s-card">
          <h2>ส่งคำขอใหม่</h2>
          <form className="s-form" onSubmit={submit}>
            {params.get('variant') && (
              <label className="s-fld wide">
                <span>สีและรุ่นย่อยที่สนใจ</span>
                <input
                  className="s-in"
                  name="configuration"
                  defaultValue={[params.get('variant'), params.get('color')]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </label>
            )}
            <label className="s-fld">
              <span>รถที่สนใจ *</span>
              <select
                className="s-in"
                name="car"
                required
                defaultValue={
                  cars.some((car) => car.name === params.get('car'))
                    ? params.get('car')
                    : ''
                }
              >
                <option value="" disabled>
                  เลือกรถ
                </option>
                {cars.map((car) => (
                  <option key={car.name}>{car.name}</option>
                ))}
              </select>
            </label>
            <label className="s-fld">
              <span>ประเภทคำขอ *</span>
              <select
                className="s-in"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {['สนใจ', 'จอง', 'นัดดูรถ'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="s-fld">
              <span>วันที่นัด{type === 'นัดดูรถ' ? ' *' : ''}</span>
              <input
                className="s-in"
                type="date"
                name="date"
                min={today}
                required={type === 'นัดดูรถ'}
              />
            </label>
            <label className="s-fld">
              <span>ช่วงเวลา{type === 'นัดดูรถ' ? ' *' : ''}</span>
              <select
                className="s-in"
                name="time"
                required={type === 'นัดดูรถ'}
                defaultValue=""
              >
                <option value="">เลือกช่วงเวลา</option>
                <option>เช้า 09:00–12:00</option>
                <option>บ่าย 13:00–16:00</option>
                <option>เย็น 16:00–18:00</option>
              </select>
            </label>
            <label className="s-fld wide">
              <span>ข้อความถึงทีมขาย</span>
              <textarea
                className="s-in"
                name="note"
                maxLength={1000}
                placeholder="เช่น ขอดูสีขาว ผ่อน 5 ปี"
              />
            </label>
            <label className="s-chk">
              <input name="insurance" type="checkbox" />
              สนใจทำประกันพร้อมออกรถ
            </label>
            <div className="s-form-f">
              <button className="s-btn pri" type="submit">
                บันทึกคำขอตัวอย่าง
              </button>
            </div>
            <p className="form-message" role="status">
              {message}
            </p>
          </form>
        </section>
        <Details {...page.blocks[2]} />
      </div>
      <section className="s-card flush">
        <div className="s-card-h">
          <h2>สถานะคำขอของฉัน</h2>
          <span className="small">ข้อมูลตัวอย่าง</span>
        </div>
        <div className="s-tw">
          <table className="s-tbl">
            <thead>
              <tr>
                {['รถ', 'ประเภท', 'วันนัด', 'สถานะ', 'การดำเนินการ'].map(
                  (label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.car}</td>
                  <td>{row.type}</td>
                  <td>{row.date}</td>
                  <td>
                    <Pill>{row.status}</Pill>
                  </td>
                  <td>
                    {row.status === 'รอ Admin' && (
                      <button
                        className="s-act"
                        onClick={() => {
                          save(
                            rows.map((item) =>
                              item.id === row.id
                                ? { ...item, status: 'ยกเลิก' }
                                : item,
                            ),
                          );
                          setMessage('ยกเลิกคำขอตัวอย่างแล้ว');
                        }}
                      >
                        ยกเลิกคำขอ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="s-card-f">แสดง {rows.length} รายการ</div>
      </section>
    </div>
  );
}
