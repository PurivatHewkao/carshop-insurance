import { useState, useSyncExternalStore } from 'react';
import { getSnapshot, subscribe } from '../api/mockPaymentApi.js';

export function usePaymentData() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// เรียก action ของ API จำลอง แล้วเก็บข้อความผล/ข้อผิดพลาดไว้แสดงในหน้า
// คืนผลของ action เมื่อสำเร็จ หรือ null เมื่อ error
export function useAction() {
  const [message, setMessage] = useState(null);
  function run(action, success) {
    try {
      const result = action();
      setMessage(success ? { ok: true, text: success(result) } : null);
      return result;
    } catch (error) {
      setMessage({ ok: false, text: error.message });
      return null;
    }
  }
  return [message, run, setMessage];
}
