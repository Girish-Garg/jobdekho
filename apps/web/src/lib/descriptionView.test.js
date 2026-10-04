import { describe, it, expect } from 'vitest';
import { lineGroups, sectionView, factItems } from './descriptionView.js';

const section = (kind, heading, lines, boilerplate = false) => ({ kind, heading, lines, boilerplate });

describe('lineGroups', () => {
  it('reads lines that start "- " as one list until a plain line ends it', () => {
    expect(lineGroups(['Intro.', '- One', '- Two', 'After.', '- Three'])).toEqual([
      { kind: 'text', text: 'Intro.' },
      { kind: 'list', items: ['One', 'Two'] },
      { kind: 'text', text: 'After.' },
      { kind: 'list', items: ['Three'] },
    ]);
  });

  it('reads a short line ending in a colon as a label, never a sentence that does', () => {
    expect(lineGroups(['Stipend:', 'Up to Rs 10,000.', 'Note: we reply within a week. Thanks:']).map((g) => g.kind)).toEqual(['label', 'text', 'text']);
  });
});

describe('sectionView', () => {
  it('keeps the order and the posting headings, the opening summary with none', () => {
    const { shown, folded } = sectionView([
      section('other', null, ['Acme builds rails.']),
      section('duties', 'What you will do', ['- Ship']),
      section('requirements', 'Requirements', ['- 3 years']),
    ]);
    expect(shown.map((s) => s.heading)).toEqual([null, 'What you will do', 'Requirements']);
    expect(folded).toEqual([]);
  });

  // Never deleted: folded text is still there, under one toggle.
  it('folds equal-opportunity and company template text, in its order', () => {
    const { shown, folded } = sectionView([
      section('duties', 'Role', ['- Build']),
      section('about', 'About Acme', ['Acme is everywhere.'], true),
      section('other', null, ['Acme is an equal opportunity employer.'], true),
    ]);
    expect(shown).toHaveLength(1);
    expect(folded.map((s) => s.groups[0].text)).toEqual(['Acme is everywhere.', 'Acme is an equal opportunity employer.']);
  });

  // The part of an "About us" that is not template text loses the heading
  // to the folded part; it takes the plain name of what it holds.
  it('names a split-off section by what it holds, or lets it carry on from its own kind', () => {
    const { shown } = sectionView([
      section('duties', 'Role', ['- Build']),
      section('duties', null, ['- Also test']),
      section('about', null, ['We are 40 people in Pune.']),
      section('about', 'About Acme', ['Acme is everywhere.'], true),
    ]);
    expect(shown.map((s) => s.heading)).toEqual(['Role', null, 'About the company']);
  });
});

describe('factItems', () => {
  it('lists years, pay and work mode with the words that said each', () => {
    const items = factItems({
      years: { min: 3, max: 5, from: 'text', evidence: 'Says "3 to 5 years of experience"' },
      pay: { value: '₹ 4,00,000 /year', label: '₹4L/yr', currency: 'INR', monthly: 33333, from: 'board', evidence: 'Pay field: ₹ 4,00,000 /year' },
      workMode: { value: 'hybrid', from: 'text', evidence: 'Says "Workplace type: Hybrid"' },
    });
    expect(items.map(({ key, value, evidence }) => [key, value, evidence])).toEqual([
      ['years', '3 to 5 years', 'Says "3 to 5 years of experience"'],
      ['pay', '₹4L/yr', 'Pay field: ₹ 4,00,000 /year'],
      ['mode', 'Hybrid', 'Says "Workplace type: Hybrid"'],
    ]);
  });

  it('leaves out what the text does not state, and a pay it could not read', () => {
    expect(factItems(null)).toEqual([]);
    expect(factItems({ years: null, pay: { value: '400000', label: null, evidence: 'x' }, workMode: null })).toEqual([]);
  });
});
