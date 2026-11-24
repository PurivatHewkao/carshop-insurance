// Insurance: extra fields isolated from the existing sales form.
export default function NovaInsuranceFields({
  form,
  setForm,
  plans,
  loading,
  error,
  reload,
}) {
  const plan = plans.find((item) => item.id === form.insuranceId);
  return (
    <section aria-label="ข้อมูลประกัน NOVA">
      {loading && <p role="status">กำลังโหลดแพ็กเกจ NOVA…</p>}
      {error && (
        <p role="alert">
          โหลดแพ็กเกจ NOVA ไม่สำเร็จ ยังขายรถแบบไม่รับประกันได้{' '}
          <button type="button" onClick={reload}>
            ลองใหม่
          </button>
        </p>
      )}
      {plan && (
        <>
          <p>
            เบี้ยเต็ม{' '}
            {plan.originalAmount.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
            })}{' '}
            บาท · ส่วนลด NOVA{' '}
            {plan.discountAmount.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
            })}{' '}
            บาท (5% สูงสุด 1,000 บาท)
          </p>
          <p>
            เบี้ยสุทธิ{' '}
            {plan.finalAmount.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
            })}{' '}
            บาท · {plan.insuranceType}
          </p>
          <p>{plan.description}</p>
          {plan.ratingVersion && (
            <p>
              คำนวณสำหรับรถที่เลือก · {plan.vehicle?.trimCode} · ทุนประกัน{' '}
              {plan.sumInsured.toLocaleString('th-TH')} บาท · วงเงินชน{' '}
              {plan.collisionLimit.toLocaleString('th-TH')} บาท · ซ่อมอู่ ·
              ไม่รวม พ.ร.บ.
            </p>
          )}
          <div className="sales-form-group">
            <label htmlFor="nova-delivery-date">
              วันส่งมอบรถ / วันเริ่มคุ้มครอง *
            </label>
            <input
              id="nova-delivery-date"
              className="sales-input"
              type="date"
              required
              value={form.deliveryDate || ''}
              onChange={(event) =>
                setForm({ ...form, deliveryDate: event.target.value })
              }
            />
            <small>
              คุ้มครอง 1 ปีนับจากวันส่งมอบรถ รอ NOVA อนุมัติหลังชำระเงินครบ
              ส่วนลดในช่องการขายเป็นส่วนลดเพิ่มเติม
            </small>
          </div>
        </>
      )}
    </section>
  );
}
