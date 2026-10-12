import { useState } from 'react';
import design from '../../../design/toyoty.json';
import { CarGrid, CarImage } from '../../../components/common/Showroom.jsx';
const catalog = design.roles[0].pages[1];
const allCars = catalog.blocks.find((block) => block.t === 'cars').items;
export default function CarsPage() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [budget, setBudget] = useState('');
  const [sort, setSort] = useState('asc');
  const price = (car) => Number(car.price.replace(/[^0-9]/g, ''));
  const cars = allCars
    .filter(
      (car) =>
        (!category || car.type === category) &&
        car.name.toLowerCase().includes(search.toLowerCase()) &&
        (!budget || price(car) <= Number(budget)),
    )
    .sort((a, b) =>
      sort === 'asc' ? price(a) - price(b) : price(b) - price(a),
    );
  return (
    <div className="page-content">
      <header className="s-ph">
        <div>
          <p className="s-crumb">หน้าแรก / รถทั้งหมด</p>
          <h1>รายการรถ</h1>
          <p>{catalog.sub}</p>
        </div>
      </header>
      <div className="s-cats" aria-label="ประเภทรถ">
        {catalog.blocks[0].items.map((item) => (
          <button
            className={'s-cat ' + (category === item.type ? 'on' : '')}
            aria-pressed={category === item.type}
            key={item.l}
            onClick={() => setCategory(item.type)}
          >
            {item.type ? (
              <CarImage type={item.type} outline />
            ) : (
              <span className="category-all" aria-hidden="true">
                ▦
              </span>
            )}
            {item.l}
          </button>
        ))}
      </div>
      <div className="s-tools">
        <label className="catalog-search">
          <span className="sr-only">ค้นหารุ่นรถ</span>
          <input
            className="s-in"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารุ่นรถ…"
            type="search"
          />
        </label>
        <label>
          <span className="sr-only">งบประมาณสูงสุด</span>
          <select
            className="s-in"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          >
            <option value="">ทุกช่วงราคา</option>
            <option value="600000">ไม่เกิน 600,000 บาท</option>
            <option value="1000000">ไม่เกิน 1,000,000 บาท</option>
            <option value="1500000">ไม่เกิน 1,500,000 บาท</option>
          </select>
        </label>
        <label className="sort-control">
          <span className="sr-only">เรียงราคา</span>
          <select
            className="s-in"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="asc">เรียง: ราคาต่ำ → สูง</option>
            <option value="desc">เรียง: ราคาสูง → ต่ำ</option>
          </select>
        </label>
      </div>
      <div aria-live="polite">
        <CarGrid title="รถทุกรุ่น" items={cars} />
        {!cars.length && (
          <p className="empty-state">
            ไม่พบรถที่ตรงกับตัวกรอง ลองค้นหาหรือเลือกช่วงราคาใหม่
          </p>
        )}
      </div>
      <p className="small">
        ราคาและสถานะรถเป็นข้อมูลตัวอย่างเพื่อแสดงหน้าตาเว็บไซต์
      </p>
    </div>
  );
}
