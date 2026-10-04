import { describe, it, expect } from 'vitest';
import { levelChip, modeChip, yearsLabel } from './tagEvidence.js';

const tag = (value, evidence, from = 'title') => ({ value, from, evidence, version: 2 });

describe('levelChip', () => {
  it('names the level with the words it was read from', () => {
    expect(levelChip({ level: 'senior', levelTag: tag('senior', 'Title says Senior') }))
      .toEqual({ label: 'Senior', evidence: ['Title says Senior'] });
  });

  // No Mid default: a posting that does not say its level has no chip.
  it('has no chip when the posting does not say its level', () => {
    expect(levelChip({ level: null, levelTag: null })).toBeNull();
    expect(levelChip({})).toBeNull();
  });

  // The Internship chip is also the type chip, so it carries the type's
  // evidence too, once.
  it('adds the type evidence to an internship only when it says something else', () => {
    const same = { level: 'internship', levelTag: tag('internship', 'Title says Intern'), typeTag: tag('internship', 'Title says Intern') };
    expect(levelChip(same).evidence).toEqual(['Title says Intern']);
    const board = { level: 'internship', levelTag: tag('internship', 'Says "This is a 6-month internship"', 'text'), typeTag: tag('internship', 'Internshala lists it as an internship', 'board') };
    expect(levelChip(board).evidence).toEqual(['Says "This is a 6-month internship"', 'Internshala lists it as an internship']);
  });

  it('leaves a job type out of a non-internship level', () => {
    const job = { level: 'mid', levelTag: tag('mid', 'Asks for 3 to 5 years', 'text'), typeTag: tag('job', 'Employment type: Full-time', 'board') };
    expect(levelChip(job).evidence).toEqual(['Asks for 3 to 5 years']);
  });

  it('still shows a level that came with no evidence', () => {
    expect(levelChip({ level: 'staff' })).toEqual({ label: 'Staff', evidence: [] });
  });
});

describe('modeChip', () => {
  it('names a stated mode with its evidence, Onsite included', () => {
    expect(modeChip({ workMode: 'hybrid', workModeTag: tag('hybrid', 'Workplace type: Hybrid', 'board') }))
      .toEqual({ label: 'Hybrid', evidence: ['Workplace type: Hybrid'] });
    expect(modeChip({ workMode: 'onsite', workModeTag: tag('onsite', 'Board tag: onsite', 'board') }).label).toBe('Onsite');
  });

  it('says nothing for an unknown mode or the one most of the page shares', () => {
    expect(modeChip({ workMode: null })).toBeNull();
    expect(modeChip({ workMode: 'remote' }, 'remote')).toBeNull();
  });
});

describe('yearsLabel', () => {
  it('reads a range with "to", never a dash', () => {
    expect(yearsLabel({ min: 3, max: 5 })).toBe('3 to 5 years');
  });

  it('reads a floor alone as a minimum, and none at all as none needed', () => {
    expect(yearsLabel({ min: 5, max: null })).toBe('5+ years');
    expect(yearsLabel({ min: 0, max: null })).toBe('No experience needed');
    expect(yearsLabel(null)).toBe('');
  });
});
