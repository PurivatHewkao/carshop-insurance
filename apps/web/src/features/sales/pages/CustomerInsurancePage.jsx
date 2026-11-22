// Insurance: each response is scoped to the signed-in customer by Sales.
import { useEffect } from 'react';
import { fetchMyInsurance } from '../api/insuranceApi.js';
import { useSalesData } from '../hooks/useSalesData.js';
import '../sales.css';
const labels = {
  AWAITING_PAYMENT: 'รอชำระเงิน',
  QUEUED: 'กำลังส่งข้อมูลให้ NOVA',
  PENDING_APPROVAL: 'รอประกันอนุมัติ',
  ISSUED: 'ออกกรมธรรม์แล้ว',
  ORDER_CANCELLED: 'คำสั่งซื้อถูกยกเลิก',
};
const money = (amount) =>
  Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 });
export default function CustomerInsurancePage() {
  const state = useSalesData(fetchMyInsurance);
  const { reload } = state;
  useEffect(() => {
    const timer = setInterval(reload, 15000);
    return () => clearInterval(timer);
  }, [reload]);
  return (
    <div className="sales-container">
      <h1>ประกันของฉัน</h1>
      <p>ประกัน NOVA ที่เลือกซื้อพร้อมรถ คุ้มครอง 1 ปีนับจากวันส่งมอบรถ</p>
      <button
        className="sales-btn"
        onClick={reload}
        type="button"
        disabled={state.loading}
      >
        อัปเดตข้อมูล
      </button>
      {state.loading && !state.data && <p role="status">กำลังโหลดข้อมูล…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {state.data?.length === 0 && <p>ยังไม่มีรายการประกันที่ซื้อพร้อมรถ</p>}
      {state.data?.map((item) => (
        <article
          className="sales-card"
          key={item.orderId}
          style={{ marginTop: 20 }}
        >
          <h2>{item.plan.name} · NOVA</h2>
          <p>
            <strong>{labels[item.status] || item.status}</strong>
          </p>
          <p>คำสั่งซื้อ: {item.orderId}</p>
          <p>
            รถ: {item.vehicle.brand} {item.vehicle.model} ({item.vehicle.year})
          </p>
          <p>เลขตัวถัง: {item.vehicle.vin}</p>
          <p>ประเภท: {item.plan.insuranceType}</p>
          <p>
            เบี้ยเต็ม {money(item.plan.originalAmount)} บาท · ส่วนลด{' '}
            {money(item.plan.discountAmount)} บาท · เบี้ยสุทธิ{' '}
            {money(item.plan.finalAmount)} บาท
          </p>
          <p>วันส่งมอบรถ: {item.deliveryDate}</p>
          {item.policy && (
            <dl>
              <dt>เลขกรมธรรม์</dt>
              <dd>{item.policy.policyNumber}</dd>
              <dt>วันเริ่มคุ้มครอง</dt>
              <dd>{item.policy.startsOn}</dd>
              <dt>วันสิ้นสุดคุ้มครอง</dt>
              <dd>{item.policy.endsOn} (รวมวันนี้)</dd>
            </dl>
          )}
          <details>
            <summary>รายละเอียดความคุ้มครอง</summary>
            <p>{item.plan.description}</p>
            <ul>
              {item.plan.coverage?.highlights?.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </details>
        </article>
      ))}
    </div>
  );
}
