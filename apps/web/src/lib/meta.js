export function stipendAmount(text) {
  if (!text) return 0
  const t = text.toLowerCase()
  if (t.includes('unpaid')) return 0
  const m = text.replace(/,/g, '').match(/\d+/)
  return m ? Number(m[0]) : 0
}

export function experienceYears(text) {
  if (!text || text === 'Fresher') return 0
  const m = text.match(/\d+/)
  return m ? Number(m[0]) : 0
}

export function durationMonths(text) {
  if (!text) return 0
  const lower = text.toLowerCase()
  const monthMatch = lower.match(/(\d+)\s*month/)
  if (monthMatch) return Number(monthMatch[1])
  const weekMatch = lower.match(/(\d+)\s*week/)
  if (weekMatch) return Math.max(1, Math.round(Number(weekMatch[1]) / 4))
  return 0
}
