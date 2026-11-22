import { Link, useParams } from 'react-router-dom';
import {
  fetchAppointments,
  fetchCustomer,
  fetchOrders,
} from '../api/salesApi.js';
import { LoadStatus } from '../components/SalesState.jsx';
import { useSalesData } from '../hooks/useSalesData.js';
import '../sales.css';

export default function SellerCustomerDetailPage() {
  const { customerId = '' } = useParams();
  const customer = useSalesData(
    (signal) => fetchCustomer(customerId, signal),
    [customerId],
  );
  const activity = useSalesData(
    async (signal) => {
      const [appointments, orders] = await Promise.all([
        fetchAppointments({}, signal),
        fetchOrders({}, signal),
      ]);
      return {
        appointments: appointments.filter(
          (item) => item.customerId === customerId,
        ),
        orders: orders.filter((item) => item.customerId === customerId),
      };
    },
    [customerId],
  );
  const details = customer.data;
  const history = activity.data || { appointments: [], orders: [] };
  const error = customer.error || activity.error;

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <p className="sales-eyebrow">SELLER / CUSTOMER PROFILE</p>
          <h1>รายละเอียดลูกค้า</h1>
          <p>ข้อมูลติดต่อและประวัติที่เกี่ยวข้องกับงานของคุณ</p>
        </div>
        <Link className="sales-btn sales-btn-outline" to="/seller/tasks">
          กลับไปงานของฉัน
        </Link>
      </div>

      <LoadStatus
        loading={customer.loading || activity.loading}
        error={error}
        hasData={Boolean(details)}
        onRetry={() => {
          customer.reload();
          activity.reload();
        }}
      />

      {details && !customer.error && (
        <>
          <section className="sales-card sales-customer-profile">
            <div className="sales-customer-avatar" aria-hidden="true">
              {details.name.trim().charAt(0) || 'ล'}
            </div>
            <div className="sales-customer-identity">
              <span className="sales-contact-label">ข้อมูลลูกค้า</span>
              <h2>{details.name}</h2>
              <div className="sales-customer-contact-list">
                {details.phone && (
                  <a href={`tel:${details.phone.replace(/[^\d+]/g, '')}`}>
                    โทร {details.phone}
                  </a>
                )}
                {details.email && (
                  <a href={`mailto:${details.email}`}>{details.email}</a>
                )}
              </div>
            </div>
          </section>

          <section className="sales-card">
            <div className="sales-section-heading">
              <div>
                <h2>ประวัตินัดหมาย</h2>
                <p>แสดงเฉพาะนัดหมายที่มอบหมายให้คุณ</p>
              </div>
              <span className="sales-count-pill">
                {history.appointments.length} รายการ
              </span>
            </div>
            <div className="sales-table-wrapper">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th>รหัสนัดหมาย</th>
                    <th>รถ / บริการ</th>
                    <th>วันและเวลา</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {!activity.loading && history.appointments.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="sales-empty">
                        ยังไม่มีนัดหมายที่เกี่ยวข้อง
                      </td>
                    </tr>
                  ) : (
                    history.appointments.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.code}</strong>
                        </td>
                        <td>
                          {item.carModel}
                          <small className="sales-cell-subtitle">
                            {item.type}
                          </small>
                        </td>
                        <td>
                          {item.preferredDate} · {item.preferredTime} น.
                        </td>
                        <td>
                          <span
                            className={`sales-badge ${item.status === 'COMPLETED' ? 'badge-completed' : item.status === 'CANCELLED' ? 'badge-cancelled' : item.status === 'ASSIGNED' ? 'badge-assigned' : 'badge-pending'}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sales-card">
            <div className="sales-section-heading">
              <div>
                <h2>ประวัติใบสั่งซื้อ</h2>
                <p>คำสั่งซื้อที่คุณเป็นผู้รับผิดชอบ</p>
              </div>
              <span className="sales-count-pill">
                {history.orders.length} รายการ
              </span>
            </div>
            <div className="sales-table-wrapper">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th>เลขที่ Order</th>
                    <th>รถ</th>
                    <th>ยอดสุทธิ</th>
                    <th>สถานะอนุมัติ</th>
                  </tr>
                </thead>
                <tbody>
                  {!activity.loading && history.orders.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="sales-empty">
                        ยังไม่มีใบสั่งซื้อที่เกี่ยวข้อง
                      </td>
                    </tr>
                  ) : (
                    history.orders.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.code}</strong>
                        </td>
                        <td>{item.carModel}</td>
                        <td>฿{item.totalAmount.toLocaleString()}</td>
                        <td>
                          <span
                            className={`sales-badge ${item.status === 'APPROVED' ? 'badge-approved' : item.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
