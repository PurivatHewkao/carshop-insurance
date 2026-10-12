const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const CARS = {
  sedan: {
    body: 'M28,186 L26,152 Q26,140 40,138 L148,130 Q175,126 192,104 Q205,86 236,84 L338,84 Q380,86 410,108 L440,128 L566,138 Q604,146 614,160 L616,186 Z',
    glass:
      'M168,126 Q184,106 198,98 Q210,90 238,92 L296,92 L296,126 Z M308,92 L338,92 Q372,94 398,112 L420,126 L308,126 Z',
    head: 'M586,142 Q604,148 612,158 L606,162 Q592,156 574,152 Z',
    tail: 'M27,146 L29,162 L42,160 L41,141 Z',
    wheels: [138, 502],
    wy: 182,
    r: 38,
    trim: 172,
    door: 302,
    belt: 128,
    extra: '',
  },
  hatch: {
    body: 'M52,186 L50,146 Q52,134 70,130 Q96,100 130,90 Q150,84 178,84 L318,84 Q372,86 404,110 L434,128 L548,138 Q582,146 592,160 L594,186 Z',
    glass:
      'M100,126 Q118,104 140,96 Q152,92 176,92 L268,92 L268,126 Z M280,92 L316,92 Q352,94 380,112 L398,126 L280,126 Z',
    head: 'M562,142 Q580,148 590,158 L584,162 Q570,156 552,152 Z',
    tail: 'M51,142 L52,160 L64,158 L62,138 Z',
    wheels: [150, 486],
    wy: 182,
    r: 36,
    trim: 172,
    door: 274,
    belt: 128,
    extra: '',
  },
  suv: {
    body: 'M26,186 L24,130 Q26,114 44,110 L112,104 Q132,100 142,82 Q152,68 182,66 L372,66 Q412,68 436,94 L458,116 L570,126 Q606,134 616,152 L618,186 Z',
    glass:
      'M146,108 Q152,84 182,76 L290,76 L290,108 Z M302,76 L370,76 Q402,78 424,100 L442,108 L302,108 Z',
    head: 'M588,134 Q606,140 614,152 L608,158 Q594,150 576,146 Z',
    tail: 'M25,126 L27,150 L40,148 L39,122 Z',
    wheels: [146, 504],
    wy: 180,
    r: 42,
    trim: 166,
    door: 296,
    belt: 110,
    extra:
      '<path d="M176,62 L380,62" stroke="#111" stroke-width="3" stroke-linecap="round" opacity=".7"/>',
  },
  pickup: {
    body: 'M24,186 L24,120 L184,120 L184,110 Q192,86 222,78 L286,72 L362,72 Q396,74 420,100 L442,118 L572,124 Q606,132 616,152 L618,186 Z',
    glass:
      'M200,112 Q206,92 228,86 L288,82 L288,112 Z M300,82 L360,82 Q388,84 410,104 L426,112 L300,112 Z',
    head: 'M586,136 Q604,142 614,154 L608,160 Q594,152 576,148 Z',
    tail: 'M23,126 L24,150 L36,148 L36,124 Z',
    wheels: [112, 506],
    wy: 180,
    r: 42,
    trim: 166,
    door: 294,
    belt: 114,
    extra:
      '<path d="M26,118 L184,118 L184,123 L26,123 Z" fill="#000" opacity=".35"/>',
  },
};
export const TYPE_TH = {
  sedan: 'ซีดาน',
  hatch: 'แฮทช์แบ็ก',
  suv: 'SUV',
  pickup: 'กระบะ',
};
let gid = 0;
const SX = 0.74,
  SY = 1.16,
  TF = 'translate(320 186) scale(' + SX + ' ' + SY + ') translate(-320 -186)',
  MX = (x) => 320 + (x - 320) * SX;
const VB = '66 28 508 208';
export function carSvg(type, color, o) {
  const T = CARS[type] || CARS.sedan;
  if (o && o.outline) {
    return `<svg viewBox="${VB}" fill="none" stroke="currentColor" stroke-width="9" stroke-linejoin="round" aria-hidden="true"><g transform="${TF}"><path d="${T.body}"/><path d="${T.glass}"/></g>${T.wheels.map((x) => `<circle cx="${MX(x)}" cy="${T.wy}" r="${T.r}"/>`).join('')}</svg>`;
  }
  const id = 'c' + ++gid,
    col = color || '#9EA2AA',
    ty = 186 + (T.trim - 186) * SY;
  const wheel = (x) => {
    const cx = MX(x),
      r = T.r,
      sp = [0, 1, 2, 3, 4]
        .map((i) => {
          const a = (i * 72 * Math.PI) / 180;
          return `<path d="M${cx},${T.wy} L${(cx + Math.sin(a) * r * 0.66).toFixed(1)},${(T.wy - Math.cos(a) * r * 0.66).toFixed(1)}" stroke="#6B6F78" stroke-width="${(r * 0.1).toFixed(1)}" stroke-linecap="round"/>`;
        })
        .join('');
    return `<circle cx="${cx}" cy="${T.wy}" r="${r}" fill="#17181B"/><circle cx="${cx}" cy="${T.wy}" r="${(r * 0.72).toFixed(1)}" fill="#D3D6DB"/><circle cx="${cx}" cy="${T.wy}" r="${(r * 0.52).toFixed(1)}" fill="#A8ACB4"/>${sp}<circle cx="${cx}" cy="${T.wy}" r="${(r * 0.16).toFixed(1)}" fill="#3A3C42"/>`;
  };
  return `<svg viewBox="${VB}" role="img" aria-label="ภาพจำลองรถ"><defs>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C4757"/><stop offset="1" stop-color="#10151C"/></linearGradient>
    <radialGradient id="${id}f"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <clipPath id="${id}c"><path d="${T.body}" transform="${TF}"/></clipPath></defs>
    <ellipse cx="320" cy="222" rx="236" ry="11" fill="url(#${id}f)"/>
    <g transform="${TF}"><path d="${T.body}" fill="${esc(col)}"/><path d="${T.body}" fill="url(#${id}s)"/>
    <path d="${T.glass}" fill="url(#${id}g)"/>
    <path d="M${T.door},${T.belt} L${T.door},${T.trim}" stroke="#000" stroke-opacity=".28" stroke-width="2"/>
    ${T.extra}</g>
    <g clip-path="url(#${id}c)"><rect x="0" y="${ty.toFixed(1)}" width="640" height="60" fill="#000" opacity=".26"/>${T.wheels.map((x) => `<circle cx="${MX(x)}" cy="${T.wy}" r="${T.r + 6}" fill="#0B0C0E"/>`).join('')}</g>
    <g transform="${TF}"><path d="${T.head}" fill="#fff"/><path d="${T.tail}" fill="#FF3347"/></g>
    ${T.wheels.map(wheel).join('')}</svg>`;
}
