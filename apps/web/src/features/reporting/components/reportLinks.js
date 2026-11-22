// The five report pages: all reports, sales & orders, finance, cars & stock,
// activity history. `base` is "/manager", "/admin" or "" (public /reporting).
export function reportLinks(base) {
  const reports = base ? `${base}/reports` : '/reporting';
  return [
    [reports, 'รายงานทั้งหมด'],
    [`${reports}/sales`, 'ยอดขายและออเดอร์'],
    [`${reports}/finance`, 'การเงิน'],
    [`${reports}/inventory`, 'รถและสต็อก'],
    [base ? `${base}/activity-logs` : '/reporting/activity-logs', 'ประวัติกิจกรรม'],
  ];
}
