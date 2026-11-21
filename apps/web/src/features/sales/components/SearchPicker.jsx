import { useMemo, useRef, useState } from 'react';

/** A searchable dialog for choosing from large customer, car, or employee lists. */
export default function SearchPicker({ label, value, options, onChange, placeholder = 'ค้นหาชื่อ…', disabled = false }) {
  const dialogRef = useRef(null);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.id === value);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? options.filter((option) => `${option.name} ${option.detail || ''}`.toLocaleLowerCase().includes(needle)) : options;
  }, [options, query]);

  function openPicker() {
    setQuery('');
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button type="button" className="sales-picker-trigger" onClick={openPicker} disabled={disabled} aria-label={`เลือก${label}`}>
        <span><small>{label}</small><strong>{selected?.name || `เลือก${label}`}</strong>{selected?.detail && <em>{selected.detail}</em>}</span>
        <b aria-hidden="true">⌕</b>
      </button>
      <dialog className="sales-picker-dialog" ref={dialogRef} aria-label={`เลือก${label}`} onClose={() => setQuery('')}>
        <div className="sales-picker-head"><div><small>เลือกรายการ</small><h2>{label}</h2></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="ปิด">×</button></div>
        <input autoFocus className="sales-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label={`ค้นหา${label}`} />
        <div className="sales-picker-options" role="listbox" aria-label={label}>
          {filtered.length ? filtered.map((option) => (
            <button type="button" role="option" aria-selected={option.id === value} key={option.id} onClick={() => { onChange(option.id); dialogRef.current?.close(); }}>
              <strong>{option.name}</strong>{option.detail && <small>{option.detail}</small>}
            </button>
          )) : <p className="sales-picker-empty">ไม่พบรายการที่ค้นหา</p>}
        </div>
      </dialog>
    </>
  );
}
