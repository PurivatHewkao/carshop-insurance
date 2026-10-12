import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import design from '../../../design/toyoty.json';
import { TYPE_TH } from '../../../design/carSvg.js';
import {
  Action,
  CarImage,
  Details,
  ItemList,
  Pill,
  Specs,
} from '../../../components/common/Showroom.jsx';
const detail = design.roles[0].pages[2].blocks;
const cars = design.roles[0].pages[1].blocks[2].items;
export default function CarDetailPage() {
  const { name } = useParams();
  const car = cars.find((car) => car.name === name);
  const [color, setColor] = useState(0);
  const [variant, setVariant] = useState(0);
  if (!car)
    return (
      <div className="page-content">
        <h1>ไม่พบรุ่นรถ</h1>
        <Action to="/catalog">กลับไปดูรถทั้งหมด</Action>
      </div>
    );
  const isCross = car.name === 'Corolla Cross';
  const info = detail[0];
  const variants = isCross
    ? info.variants
    : [{ n: 'รุ่นมาตรฐาน', price: car.price.replace(' +', '') }];
  const selectedVariant = variants[variant] || variants[0];
  const selectedColor =
    color === 0 ? { n: 'สีมาตรฐาน', c: car.color } : info.colors[color];
  const request =
    '/requests?' +
    new URLSearchParams({
      car: car.name,
      color: selectedColor.n,
      variant: selectedVariant.n,
    }).toString();
  return (
    <div className="page-content">
      <p className="s-crumb">
        <Link to="/catalog">รถทั้งหมด</Link> / {TYPE_TH[car.type]} / {car.name}
      </p>
      <div className="s-pd">
        <div>
          <div className="s-pd-stage">
            <CarImage type={car.type} color={selectedColor.c} />
          </div>
          <div className="s-pd-sw" aria-label="เลือกสีรถ">
            {info.colors.map((item, i) => (
              <button
                key={item.n}
                className={'s-sw ' + (color === i ? 'on' : '')}
                style={{ background: i === 0 ? car.color : item.c }}
                aria-label={i === 0 ? 'สีมาตรฐาน' : item.n}
                aria-pressed={color === i}
                onClick={() => setColor(i)}
              />
            ))}
          </div>
          <p className="s-pd-swname">{selectedColor.n}</p>
        </div>
        <div className="s-pd-info">
          <p className="s-eyebrow">
            {TYPE_TH[car.type]}
            {isCross ? ' · ไฮบริด' : ''}
          </p>
          <h1>
            {car.name}
            {isCross ? ' Hybrid' : ''}
          </h1>
          <Pill>{car.tag}</Pill>
          <p className="desc">
            {isCross
              ? info.desc
              : 'เลือกรถที่เหมาะกับไลฟ์สไตล์ของคุณ พร้อมให้ทีมขายแนะนำรุ่น สี และโปรโมชันที่เหมาะสม'}
          </p>
          <div className="s-vars" role="group" aria-label="เลือกรุ่นย่อย">
            {variants.map((item, i) => (
              <button
                key={item.n}
                className={'s-var ' + (variant === i ? 'on' : '')}
                aria-pressed={variant === i}
                onClick={() => setVariant(i)}
              >
                <span className="rd" />
                <span className="nm">{item.n}</span>
                <span className="vp">{item.price}</span>
              </button>
            ))}
          </div>
          <div className="s-pd-price">
            <small>ราคาเริ่มต้น</small>
            {selectedVariant.price}
          </div>
          <div className="s-actions">
            <Action to={request + '&type=จอง'}>จองรถคันนี้</Action>
            <Action variant="out" to={request + '&type=นัดดูรถ'}>
              นัดทดลองขับ
            </Action>
          </div>
          <p className="fine">ราคาตัวอย่างเพื่อออกแบบ · รวมภาษีมูลค่าเพิ่ม</p>
        </div>
      </div>
      {isCross && (
        <>
          <Specs items={detail[1].items} />
          <div className="detail-columns">
            <Details {...detail[2]} />
            <ItemList {...detail[3]} />
          </div>
        </>
      )}
    </div>
  );
}
