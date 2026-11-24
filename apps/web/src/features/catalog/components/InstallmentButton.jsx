import { useRef } from 'react';
import { Link } from 'react-router-dom';
import InstallmentCalculator from '../../payment/components/InstallmentCalculator.jsx';
import '../../payment/payment.css';
import { formatBaht } from '../data/catalogData.js';

/**
 * Button that opens the installment table (Payment's InstallmentCalculator) for one car
 * in a dialog. Replaces the old "นัดทดลองขับ" buttons on the catalog pages.
 * price: the car price to finance (configured total on the configurator page).
 */
export default function InstallmentButton({ car, price, label = 'ดูตารางผ่อน', className = 'catalog-cta ghost', subtitle }) {
  const dialogRef = useRef(null);
  const amount = price ?? car.price;
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" className={className} onClick={() => dialogRef.current?.showModal()}>{label}</button>
      <dialog
        ref={dialogRef}
        className="catalog-installment-dialog"
        aria-label={`ตารางผ่อน ${car.brand} ${car.name}`}
        // Click on the dark backdrop closes the dialog.
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <div className="catalog-installment-body">
          <header>
            <div>
              <p className="catalog-eyebrow">INSTALLMENT PLAN</p>
              <h2>ตารางผ่อน {car.brand} {car.name}</h2>
              <p>{subtitle || (car.configurable ? 'ราคาเริ่มต้นรุ่นย่อย Eco' : 'ราคารถ')} {formatBaht(amount)}</p>
            </div>
            <button type="button" className="catalog-installment-close" onClick={close} aria-label="ปิดตารางผ่อน">×</button>
          </header>
          <InstallmentCalculator price={String(amount)} />
          {car.configurable && !price && (
            <footer>
              <Link className="catalog-cta solid" to={`/catalog/${encodeURIComponent(car.id)}`} onClick={close}>แต่งรถเพื่อดูราคาจริง</Link>
            </footer>
          )}
        </div>
      </dialog>
    </>
  );
}
