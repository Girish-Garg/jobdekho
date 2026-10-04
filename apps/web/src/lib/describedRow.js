// What a fetched description can change on a feed row: every tag, the
// plain values read from them, and the snippet. The row keeps the rest, its
// fit and status and its place in the feed included: a row does not jump
// while it is being read, and the next read of the feed puts it in order.
const FIELDS = [
  'level', 'levelTag', 'type', 'typeTag', 'workMode', 'workModeTag',
  'stipend', 'stipendMin', 'payTag', 'payLabel',
  'caution', 'legitimacy', 'ghostSignals', 'fewDetails',
  'descriptionSnippet', 'degreeMin', 'degreeRequired',
];

// The row with the described posting's tags, or the row as it was when the
// posting is another one. A row whose text states its level does not belong
// with the ones that do not, so it loses that mark; were it the first of
// that part, the "Level not stated" divider moves down past it.
export function withDescribed(row, posting) {
  if (!posting || row.id !== posting.id) return row;
  const next = { ...row };
  for (const key of FIELDS) if (key in posting) next[key] = posting[key];
  if (next.level != null) delete next.levelNotStated;
  return next;
}
