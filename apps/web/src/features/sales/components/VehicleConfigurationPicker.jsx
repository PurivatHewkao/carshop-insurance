import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useConfigurator, useQuote } from '../../catalog/api/catalogApi.js';

/** Four linked catalog choices. The emitted object is an order/appointment snapshot. */
export default function VehicleConfigurationPicker({ models, initialModel = '', initialSelection = {}, onChange, required = true }) {
  const [modelId, setModelId] = useState(initialModel);
  const [trimCode, setTrimCode] = useState(initialSelection.trim || '');
  const [colorCode, setColorCode] = useState(initialSelection.colorId || '');
  const [wheelCode, setWheelCode] = useState(initialSelection.wheelId || '');
  useEffect(() => { if (initialModel) setModelId(initialModel); }, [initialModel]);
  const { configurator, loading, error } = useConfigurator(modelId);
  const trims = configurator?.trims || [];
  const trim = trims.find((item) => item.code === trimCode);
  const colors = trim?.colors || [];
  const wheels = trim?.wheels || [];
  const color = colors.find((item) => item.code === colorCode);
  const wheel = wheels.find((item) => item.code === wheelCode);
  const value = useMemo(() => modelId && trim && color && wheel ? {
    modelSlug: modelId, modelId: configurator?.model?.uuid || '', modelName: configurator?.model?.name || configurator?.model?.modelName || '', modelBrand: configurator?.model?.brand || '',
    trim: trim.code, trimName: trim.name, colorId: color.code, colorName: color.name,
    wheelId: wheel.code, wheelName: wheel.name,
  } : null, [modelId, configurator, trim, color, wheel]);
  const { quote } = useQuote(value ? { modelSlug: value.modelSlug, trim: value.trim, colorId: value.colorId, wheelId: value.wheelId } : null);
  const configuredValue = value && quote ? { ...value, price: Number(quote.total) } : null;
  const lastSent = useRef('');
  useEffect(() => {
    const serialized = JSON.stringify(configuredValue);
    if (serialized !== lastSent.current) { lastSent.current = serialized; onChange?.(configuredValue); }
  }, [configuredValue, onChange]);
  const changeModel = (id) => { setModelId(id); setTrimCode(''); setColorCode(''); setWheelCode(''); };
  return <div className="sales-config-grid">
    <div className="sales-form-group"><label>รุ่นหลัก *</label><select className="sales-select" required={required} value={modelId} onChange={(e) => changeModel(e.target.value)}><option value="">เลือกรุ่นหลัก</option>{models.filter((item) => item.configurable).map((item) => <option key={item.id} value={item.id}>{item.brand} {item.name}</option>)}</select></div>
    <div className="sales-form-group"><label>รุ่นย่อย *</label><select className="sales-select" required={required} disabled={!modelId || loading || !trims.length} value={trim?.code || ''} onChange={(e) => { setTrimCode(e.target.value); setColorCode(''); setWheelCode(''); }}><option value="">{loading ? 'กำลังโหลด…' : 'เลือกรุ่นย่อย'}</option>{trims.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div>
    <div className="sales-form-group"><label>สี *</label><select className="sales-select" required={required} disabled={!trim} value={color?.code || ''} onChange={(e) => setColorCode(e.target.value)}><option value="">เลือกสี</option>{colors.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div>
    <div className="sales-form-group"><label>ล้อ *</label><select className="sales-select" required={required} disabled={!trim} value={wheel?.code || ''} onChange={(e) => setWheelCode(e.target.value)}><option value="">เลือกล้อ</option>{wheels.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div>
    {error && <small className="sales-slot-help">โหลดตัวเลือกรถไม่สำเร็จ: {error}</small>}
  </div>;
}
