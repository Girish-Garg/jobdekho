import { describe, it, expect } from 'vitest';
import { payText, payEvidence } from './payText.js';

// One pay format everywhere: the server's payLabel, so a card reading
// "₹4L/yr" and a pane reading "400000" cannot happen.
describe('payText', () => {
  it('shows the short form the server gave, dollars as dollars', () => {
    expect(payText({ payLabel: '₹4L/yr', stipend: '400000' })).toBe('₹4L/yr');
    expect(payText({ payLabel: '$80k to $150k/yr', stipend: '$80,000 - $150,000' })).toBe('$80k to $150k/yr');
    expect(payText({ payLabel: 'Unpaid', stipend: 'Unpaid' })).toBe('Unpaid');
  });

  it('keeps the board words where they name no amount', () => {
    expect(payText({ payLabel: null, stipend: 'Competitive salary' })).toBe('Competitive salary');
  });

  it('never prints a figure the server could not read', () => {
    expect(payText({ payLabel: null, stipend: '400000' })).toBe('');
    expect(payText({ payLabel: null, stipend: '$0k - $0k' })).toBe('');
  });

  it('says nothing for a posting with no pay at all', () => {
    expect(payText({ payLabel: null, stipend: null })).toBe('');
    expect(payText()).toBe('');
  });
});

describe('payEvidence', () => {
  it('is where the pay came from, or nothing', () => {
    expect(payEvidence({ payTag: { value: '₹ 10,000 /month', from: 'board', evidence: 'Pay field: ₹ 10,000 /month' } })).toBe('Pay field: ₹ 10,000 /month');
    expect(payEvidence({ payTag: null })).toBe('');
  });
});
