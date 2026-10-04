// Pay in the one short form the server gives every posting (payLabel:
// ₹4L/yr, ₹15k/mo, $80k to $150k/yr, Unpaid), so the row, the card and the
// pane cannot disagree. The board's own words stand only where they name no
// amount ("Competitive salary"); a figure the server could not read is left
// out rather than printed raw: a bare "400000" beside a card's "₹4L/yr"
// reads as two different jobs.
export function payText({ payLabel, stipend } = {}) {
  if (payLabel) return payLabel;
  const words = String(stipend || '').trim();
  return words && !/\d/.test(words) ? words : '';
}

// Where the pay came from, for its hover ("Pay field: ₹ 10,000 /month").
export const payEvidence = (posting) => posting?.payTag?.evidence || '';
