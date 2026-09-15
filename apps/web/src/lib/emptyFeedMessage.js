// Says what to change instead of just that nothing matched. Chips are the
// same list the filter bar renders above the feed, so the wording can never
// name a filter the person cannot also see and clear right there.
export function emptyFeedMessage(chips) {
  if (chips.length === 0) return 'Nothing matches these filters yet.';
  if (chips.length === 1) return `Nothing matches your ${chips[0].label} filter. Try removing it.`;
  return `Nothing matches these filters: ${chips.map((chip) => chip.label).join(', ')}. Try removing one.`;
}
