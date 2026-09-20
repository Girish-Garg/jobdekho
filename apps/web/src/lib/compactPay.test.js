import { describe, it, expect } from 'vitest';
import { compactPay } from './compactPay.js';

describe('compactPay', () => {
  // The shapes the real corpus carries, from Internshala stipends to
  // Greenhouse salary bands.
  it('says a yearly range in lakhs, both ends sharing the unit', () => {
    expect(compactPay('₹ 3,60,000 - 4,80,000 /year')).toBe('₹3.6-4.8L/yr');
    expect(compactPay('₹ 24,00,000 - 45,00,000 /year')).toBe('₹24-45L/yr');
  });

  it('says a monthly stipend in thousands', () => {
    expect(compactPay('₹ 10,000 - 20,000 /month')).toBe('₹10-20k/mo');
    expect(compactPay('₹ 8,000 /month')).toBe('₹8k/mo');
  });

  it('reaches for crores when the number does', () => {
    expect(compactPay('₹ 1,20,00,000 /year')).toBe('₹1.2Cr/yr');
  });

  // A tenth that says nothing is noise on a row scanned a hundred at a time.
  it('drops a decimal that adds nothing', () => {
    expect(compactPay('₹ 4,00,000 - 5,00,000 /year')).toBe('₹4-5L/yr');
  });

  it('keeps unpaid as a word, since there is no figure to shorten', () => {
    expect(compactPay('Unpaid')).toBe('Unpaid');
  });

  it('hands back anything it cannot read as an amount, and nothing for nothing', () => {
    expect(compactPay('Competitive')).toBe('Competitive');
    expect(compactPay('')).toBe('');
    expect(compactPay(null)).toBe('');
  });

  it('reads a period however the board spelled it', () => {
    expect(compactPay('5,00,000 per annum')).toBe('₹5L/yr');
    expect(compactPay('2,000 per week')).toBe('₹2k/wk');
  });
});
