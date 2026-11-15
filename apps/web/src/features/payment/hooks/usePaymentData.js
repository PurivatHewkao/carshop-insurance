import { useCallback, useEffect, useState } from 'react';
import { loadFinanceData, paymentError } from '../api/paymentApi.js';

/**
 * โหลดข้อมูลการเงินจาก Payment API
 * คืน { data, error, loading, reload } — data เป็น null จนกว่าจะโหลดเสร็จครั้งแรก
 */
export function usePaymentData(options = {}) {
  const requests = !!options.requests;
  const [state, setState] = useState({ data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadFinanceData(controller.signal, { requests })
      .then((data) => setState({ data, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((s) => ({ data: s.data, error: paymentError(error) }));
      });
    return () => controller.abort();
  }, [requests, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return {
    data: state.data,
    error: state.error,
    loading: state.data === null && state.error === null,
    reload,
  };
}

/**
 * เรียก action ของ API แล้วเก็บข้อความผล/ข้อผิดพลาดไว้แสดงในหน้า
 * run(action, success) คืนผลเมื่อสำเร็จ หรือ null เมื่อ error; busy = กำลังส่ง
 */
export function useAction() {
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  async function run(action, success) {
    setBusy(true);
    try {
      const result = await action();
      setMessage(success ? { ok: true, text: success(result) } : null);
      return result;
    } catch (error) {
      setMessage({ ok: false, text: paymentError(error) });
      return null;
    } finally {
      setBusy(false);
    }
  }
  return [message, run, setMessage, busy];
}
