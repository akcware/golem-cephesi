// JS değerini Lua tablo kaynağına çevirir (mobil sürüm için üretilen veri dosyalarında kullanılır).
// Diziler Lua'da 1'den başlar: t[0] → t[1].
export function toLua(v: unknown, ind = ''): string {
  if (v === null || v === undefined) return 'nil';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  const next = ind + '  ';
  if (Array.isArray(v)) {
    const flat = v.every((x) => typeof x !== 'object' || x === null);
    if (flat) return `{ ${v.map((x) => toLua(x, next)).join(', ')} }`;
    return `{\n${v.map((x) => `${next}${toLua(x, next)},`).join('\n')}\n${ind}}`;
  }
  const entries = Object.entries(v as Record<string, unknown>)
    .filter(([, x]) => typeof x !== 'function')
    .map(([k, x]) => `${next}${/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `[${JSON.stringify(k)}]`} = ${toLua(x, next)},`);
  return `{\n${entries.join('\n')}\n${ind}}`;
}
