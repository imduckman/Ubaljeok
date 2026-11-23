/** 2026-11-14 → 11월 14일 */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  if (!month || !day) return date
  return `${month}월 ${day}일`
}
