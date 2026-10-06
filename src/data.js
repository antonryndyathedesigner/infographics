export const demoRows = [
  ['Направление', 'Доля, %'], ['Предметный дизайн', 38], ['Графический дизайн', 27],
  ['Архитектура', 19], ['Цифровые продукты', 11], ['Другое', 5],
];
export function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}
export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim().replace(/\s/g, '').replace(/%$/, '').replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
export function seriesFromRows(rows, labelIndex, valueIndex) {
  return rows.slice(1).filter(row => String(row[labelIndex] ?? '').trim()).map(row => ({
    label: String(row[labelIndex]).trim(), value: parseNumber(row[valueIndex]),
  })).filter(row => row.value !== null);
}
export function inferColumns(rows) {
  const width = rows[0]?.length ?? 0;
  let best = 1, count = -1;
  for (let i = 0; i < width; i++) {
    const current = rows.slice(1).filter(r => parseNumber(r[i]) !== null).length;
    if (current > count) { best = i; count = current; }
  }
  if (count <= 0) return {label: 0, value: Math.min(1, width - 1)};
  return {label: best === 0 && width > 1 ? 1 : 0, value: best};
}
export function normalizePalette(text) {
  const colors = text.split(/[\s,;]+/).filter(Boolean);
  if (colors.length > 20) throw new Error('В палитре может быть не более 20 цветов.');
  return colors.map(color => {
    if (!/^#?[0-9a-f]{6}$/i.test(color) && !/^#?[0-9a-f]{3}$/i.test(color)) throw new Error(`«${color}» — некорректный HEX. Пример: #D8E568.`);
    const hex = color.replace('#', '');
    return '#' + (hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex).toUpperCase();
  });
}
