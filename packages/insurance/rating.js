// Versioned underwriting configuration, based on TOYOTY configurator 2026-11-24.
// Educational rates, not an insurer tariff. Keep separate from catalogue sale prices.
export const ratingVersion = 'nova-demo-2026-11-24-v1';
export const ratingModels = [
  {
    slug: 'e-san',
    name: 'E-san',
    type: 'ซีดาน 5 ที่นั่ง',
    factor: 100,
    third: 3490,
    thirdPlus: 6900,
    prices: [1690000, 1840000, 2040000],
    horsepower: [111, 140, 245],
  },
  {
    slug: 'khon',
    name: 'Khon',
    type: 'SUV 5 ที่นั่ง',
    factor: 110,
    third: 3990,
    thirdPlus: 7900,
    prices: [2060000, 2250000, 2410000],
    horsepower: [111, 140, 245],
  },
  {
    slug: 'iburaporn',
    name: 'Iburaporn',
    type: 'SUV 7 ที่นั่ง',
    factor: 110,
    third: 3990,
    thirdPlus: 7900,
    prices: [2220000, 2370000, 2570000],
    horsepower: [150, 204, 224],
  },
  {
    slug: 'rushri',
    name: 'RushRi',
    type: 'กระบะ 4 ประตู',
    factor: 115,
    third: 4490,
    thirdPlus: 8900,
    prices: [2200000, 2350000, 2550000],
    horsepower: [150, 204, 224],
  },
];
export const ratingTrims = [
  {
    code: 'ECO',
    name: 'Eco',
    description: 'ประหยัด คล่องตัว',
    wheel: '16 นิ้ว มาตรฐาน',
    upgrade: '17 นิ้ว ล้อแม็ก',
    extra: 15000,
  },
  {
    code: 'BALANCED',
    name: 'Balanced',
    description: 'สมดุล อุปกรณ์ครบ',
    wheel: '17 นิ้ว ล้อแม็ก',
    upgrade: '18 นิ้ว สปอร์ต',
    extra: 25000,
  },
  {
    code: 'HIGH_PERFORMANCE',
    name: 'High Performance',
    description: 'เครื่องยนต์และช่วงล่างสปอร์ต',
    wheel: '18 นิ้ว สปอร์ต',
    upgrade: '19 นิ้ว ฟอร์จ',
    extra: 45000,
  },
];
export const ratingColors = [
  { code: 'white', name: 'ขาว', hex: '#f4f4f2', extra: 0 },
  { code: 'black', name: 'ดำ', hex: '#202126', extra: 0 },
  { code: 'silver', name: 'เทาเงิน', hex: '#a7adb5', extra: 10000 },
  { code: 'blue', name: 'น้ำเงิน', hex: '#2f5488', extra: 10000 },
  { code: 'pearl-white', name: 'ขาวมุก', hex: '#ede9df', extra: 20000 },
  {
    code: 'sport-red',
    name: 'แดงสปอร์ต',
    hex: '#c8102e',
    extra: 25000,
    trim: 'HIGH_PERFORMANCE',
  },
];
export function configureVehicle(input = {}) {
  const model = ratingModels.find((m) => m.slug === input.modelSlug);
  const index = ratingTrims.findIndex((t) => t.code === input.trimCode);
  const color = ratingColors.find((c) => c.code === input.colorCode);
  if (
    !model ||
    index < 0 ||
    !color ||
    (color.trim && color.trim !== input.trimCode) ||
    !['standard', 'upgrade'].includes(input.wheelCode)
  )
    throw new Error('กรุณาเลือกรถ รุ่นย่อย สี และล้อให้ถูกต้อง');
  const trim = ratingTrims[index];
  return {
    modelSlug: model.slug,
    modelName: model.name,
    trimCode: trim.code,
    trimName: trim.name,
    year: 2026,
    colorCode: color.code,
    colorName: color.name,
    wheelCode: input.wheelCode,
    wheelName: input.wheelCode === 'upgrade' ? trim.upgrade : trim.wheel,
    baseValue: model.prices[index],
    colorExtra: color.extra,
    wheelExtra: input.wheelCode === 'upgrade' ? trim.extra : 0,
    vehicleValue:
      model.prices[index] +
      color.extra +
      (input.wheelCode === 'upgrade' ? trim.extra : 0),
  };
}
export function rateVehicle(vehicle, slug, source = 'direct') {
  const model = ratingModels.find((m) => m.slug === vehicle.modelSlug);
  if (
    !model ||
    !ratingTrims.some((t) => t.code === vehicle.trimCode) ||
    !Number.isSafeInteger(vehicle.vehicleValue) ||
    vehicle.vehicleValue <= 0 ||
    vehicle.vehicleValue > 100000000 ||
    !Number.isInteger(vehicle.year) ||
    vehicle.year < 2025 ||
    vehicle.year > 2027
  )
    throw new Error('รถคันนี้ยังไม่อยู่ในเงื่อนไขประกัน NOVA');
  const sumInsured =
    Math.floor((vehicle.vehicleValue * 80) / 100 / 10000) * 10000;
  const risk = vehicle.trimCode === 'HIGH_PERFORMANCE' ? 115 : 100;
  const round100 = (amount) => Math.round(amount / 100) * 100;
  const amounts = {
    essential: model.third,
    'smart-drive': round100((model.thirdPlus * risk) / 100),
    'extra-care': round100(
      ((((4000 + (sumInsured * 6) / 1000) * model.factor) / 100) * risk) / 100,
    ),
    signature: round100(
      ((((5000 + (sumInsured * 2) / 100) * model.factor) / 100) * risk) / 100,
    ),
  };
  const originalAmount = amounts[slug];
  if (!originalAmount) throw new Error('ไม่พบแผนประกัน');
  const discountAmount =
    source === 'toyoty' ? Math.min((originalAmount * 5) / 100, 1000) : 0;
  return {
    ratingVersion,
    vehicle,
    sumInsured: ['signature', 'extra-care'].includes(slug) ? sumInsured : 0,
    collisionLimit:
      slug === 'essential' ? 0 : slug === 'signature' ? sumInsured : 200000,
    fireTheftLimit: ['signature', 'extra-care'].includes(slug) ? sumInsured : 0,
    thirdPartyPropertyLimit: 1000000,
    thirdPartyInjuryPerPerson: 500000,
    thirdPartyInjuryPerAccident: 10000000,
    repairType: 'GARAGE',
    deductible: 0,
    includesCompulsory: false,
    source,
    originalAmount,
    discountAmount,
    finalAmount: Math.round((originalAmount - discountAmount) * 100) / 100,
  };
}
