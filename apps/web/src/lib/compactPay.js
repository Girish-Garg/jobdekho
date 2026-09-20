// Indian pay is quoted in full rupees, so a row reads "Rs 24,00,000 -
// 45,00,000 /year": 26 characters for two numbers, which truncated to
// "24,00,000-45,..." in the width a scannable row can give it. Lakhs and
// crores are how the amount is said out loud anyway, so that is what the row
// shows; the detail pane keeps the figure exactly as the board wrote it.
const CRORE = 1e7;
const LAKH = 1e5;
const THOUSAND = 1e3;

const PERIOD = [
  [/year|annum|\bpa\b|yr/i, '/yr'],
  [/month|\bmo\b/i, '/mo'],
  [/week|\bwk\b/i, '/wk'],
  [/\bday|daily/i, '/day'],
  [/hour|\bhr\b/i, '/hr'],
];

// One decimal, and only when it says something: 4.5L earns its point, 4.0L
// does not.
function scaled(amount) {
  const [value, unit] = amount >= CRORE ? [amount / CRORE, 'Cr']
    : amount >= LAKH ? [amount / LAKH, 'L']
      : amount >= THOUSAND ? [amount / THOUSAND, 'k']
        : [amount, ''];
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${unit}`;
}

export function compactPay(stipend) {
  const text = String(stipend || '').trim();
  if (!text) return '';
  if (/unpaid/i.test(text)) return 'Unpaid';

  const amounts = (text.match(/\d[\d,]*/g) || [])
    .map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => n > 0);
  if (!amounts.length) return text;

  const period = PERIOD.find(([pattern]) => pattern.test(text))?.[1] ?? '';
  // Both ends of a range share the unit of the larger, so "3.6L - 4.8L"
  // reads as one span rather than two separate figures.
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  const span = low === high ? scaled(high) : `${scaled(low).replace(/[A-Za-z]+$/, '')}-${scaled(high)}`;
  return `₹${span}${period}`;
}
