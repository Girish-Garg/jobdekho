// Small pieces the model card is written from (card.js).
export const pct = (x, digits = 1) => (x == null ? 'n/a' : `${(100 * x).toFixed(digits)}%`)
export const count = (n) => Number(n ?? 0).toLocaleString('en-US')

export function table(head, rows) {
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n')
}

export function filesLine(files) {
  return files.map((f) => `${f.file} saved ${f.date} (${count(f.rows)} rows, ${count(f.added)} not in an earlier file)`).join('; ')
}

// A finished review, as core's model/audit.json keeps it.
export function audit(record) {
  if (!record) return '- Audit: not yet audited.'
  const verdict = record.passed ? 'passes' : 'does not pass'
  const precision = record.samples ? (record.samples - record.errors) / record.samples : null
  return [
    `- Audit: the owner checked ${count(record.samples)} outputs on ${record.reviewedAt} (version ${record.version}):`,
    `  ${count(record.errors)} wrong, precision ${pct(precision)}, one-sided 95% lower bound ${pct(record.lowerBound, 2)}.`,
    `  The 98% claim ${verdict}.`,
  ].join('\n')
}

// Held-out numbers at a set of thresholds, one row per group.
export function groupRows(byGroup, unknownKey) {
  return Object.entries(byGroup).map(([group, g]) => [
    group.replace('-', ' to '),
    g.threshold == null ? 'never shown' : String(g.threshold),
    count(g.covered),
    g.covered ? pct(g.precision) : 'n/a',
    ...(unknownKey ? [count(g[unknownKey])] : []),
  ])
}
