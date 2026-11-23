import { useEffect, useState } from 'react';
import { getFinancingQuote, paymentError } from '../api/paymentApi.js';
import { money } from '../utils/format.js';

const DOWN_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 40, 50];
const TERM_OPTIONS = [12, 24, 36, 48, 60, 72, 84];

// ตัวคำนวณค่างวดผ่อนรถ (เรียก GET /financing/quote ของ Payment service)
// ใช้ได้ทุกหน้า เช่นหน้ารายละเอียดรถ: <InstallmentCalculator price="1099000.00" />
export default function InstallmentCalculator({ price }) {
  const [downPercent, setDownPercent] = useState(25);
  const [months, setMonths] = useState(60);
  const [annualRate, setAnnualRate] = useState('2.49');
  const [state, setState] = useState({ quote: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getFinancingQuote(
        { price, downPercent, months, annualRate },
        controller.signal,
      )
        .then((quote) => setState({ quote, error: '' }))
        .catch((error) => {
          if (!controller.signal.aborted)
            setState({ quote: null, error: paymentError(error) });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [price, downPercent, months, annualRate]);

  const { quote, error } = state;
  return (
    <div className="pay-calc">
      <div className="s-form">
        <label className="s-fld">
          <span>เงินดาวน์</span>
          <select
            className="s-in"
            value={downPercent}
            onChange={(e) => setDownPercent(Number(e.target.value))}
          >
            {DOWN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
        </label>
        <label className="s-fld">
          <span>ระยะผ่อน</span>
          <select
            className="s-in"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            {TERM_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} งวด ({m / 12} ปี)
              </option>
            ))}
          </select>
        </label>
        <label className="s-fld">
          <span>ดอกเบี้ย % ต่อปี (คงที่)</span>
          <input
            className="s-in"
            type="number"
            min="0"
            max="20"
            step="0.01"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
          />
        </label>
      </div>
      {error && <p className="small pay-calc-err">{error}</p>}
      {quote && (
        <>
          <div className="pay-calc-main">
            <span className="small">ค่างวดประมาณ</span>
            <b>{money(quote.monthlyInstallment)}</b>
            <span className="small">/ เดือน × {quote.months} งวด</span>
          </div>
          <dl className="pay-calc-facts">
            <div>
              <dt>เงินดาวน์</dt>
              <dd>{money(quote.downPayment)}</dd>
            </div>
            <div>
              <dt>ยอดจัดไฟแนนซ์</dt>
              <dd>{money(quote.financedAmount)}</dd>
            </div>
            <div>
              <dt>ดอกเบี้ยรวม</dt>
              <dd>{money(quote.totalInterest)}</dd>
            </div>
            <div>
              <dt>รวมจ่ายทั้งหมด</dt>
              <dd>{money(quote.totalPayable)}</dd>
            </div>
          </dl>
          <div className="pay-calc-terms" aria-label="เทียบค่างวดตามระยะผ่อน">
            {quote.terms.map((t) => (
              <button
                key={t.months}
                type="button"
                className={t.months === months ? 'on' : ''}
                onClick={() => setMonths(t.months)}
              >
                <span>{t.months} งวด</span>
                <b>{money(t.monthlyInstallment)}</b>
              </button>
            ))}
          </div>
          <p className="small">{quote.note}</p>
        </>
      )}
    </div>
  );
}
