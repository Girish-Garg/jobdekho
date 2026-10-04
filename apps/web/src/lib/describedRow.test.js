import { describe, it, expect, vi } from 'vitest';
import { withDescribed } from './describedRow.js';
import { announceDescribed, onDescribed } from './postingDescribedSignal.js';

const row = {
  id: 'p1', title: 'Engineer', status: 'saved', fit: 72, grade: 'B', level: null, levelNotStated: true,
  workMode: null, caution: [], fewDetails: false, payLabel: null, descriptionSnippet: '',
};
const described = {
  id: 'p1', status: null, level: 'senior', levelTag: { value: 'senior', from: 'text', evidence: 'Asks for 6 to 10 years' },
  workMode: 'hybrid', workModeTag: { value: 'hybrid', from: 'text', evidence: 'Says "Workplace type: Hybrid"' },
  caution: [], fewDetails: true, payLabel: '₹12L/yr', descriptionSnippet: 'We build rails.', descriptionText: 'We build rails.', sections: null,
};

describe('withDescribed', () => {
  it('takes the new tags into the row and keeps its status, fit and place', () => {
    const next = withDescribed(row, described);
    expect(next).toMatchObject({ level: 'senior', workMode: 'hybrid', fewDetails: true, payLabel: '₹12L/yr', status: 'saved', fit: 72, grade: 'B' });
    expect(next.levelTag.evidence).toBe('Asks for 6 to 10 years');
    // A list row never carries the whole text.
    expect(next).not.toHaveProperty('descriptionText');
  });

  it('takes a row whose text states its level out of the not-stated part', () => {
    expect(withDescribed(row, described)).not.toHaveProperty('levelNotStated');
    expect(withDescribed(row, { ...described, level: null })).toHaveProperty('levelNotStated', true);
  });

  it('leaves every other row as it was', () => {
    const other = { ...row, id: 'p2' };
    expect(withDescribed(other, described)).toBe(other);
    expect(withDescribed(other, null)).toBe(other);
  });
});

describe('postingDescribedSignal', () => {
  it('hands the described posting to every listener, until it stops listening', () => {
    const heard = vi.fn();
    const stop = onDescribed(heard);
    announceDescribed(described);
    stop();
    announceDescribed(described);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith(described);
  });
});
