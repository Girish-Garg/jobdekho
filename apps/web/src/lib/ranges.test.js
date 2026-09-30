import { describe, it, expect } from 'vitest';
import { EXPERIENCE_RANGES, FIT_GRADE, FIT_RANGES, STIPEND_RANGES, fitFloorLabel } from './ranges.js';

describe('FIT_RANGES', () => {
  // Mirrors GRADE_BANDS in @jobdekho/core/grade.js; a drift here would make
  // the filter's "B" cut at a number the cards do not call B.
  it('is Any plus each grade at its lower bound', () => {
    expect(FIT_RANGES).toEqual([['', 'Any'], ['62', 'A'], ['50', 'B'], ['38', 'C'], ['25', 'D']]);
    expect(FIT_GRADE).toEqual({ 62: 'A', 50: 'B', 38: 'C', 25: 'D' });
  });

  it('says a floor in grade words, and an old number as a number', () => {
    expect(fitFloorLabel('62')).toBe('Grade A');
    expect(fitFloorLabel('25')).toBe('Grade D or better');
    expect(fitFloorLabel('44')).toBe('Fit 44 and up');
  });
});

describe('the More filters steps', () => {
  it('quotes pay in Indian grouping, with LPA once it reads as a salary', () => {
    const label = (value) => STIPEND_RANGES.find(([v]) => v === value)[1];
    expect(label('1')).toBe('Paid only');
    expect(label('15000')).toBe('₹15,000+ /mo');
    expect(label('35000')).toBe('₹35,000+ /mo (4.2 LPA)');
    expect(label('100000')).toBe('₹1,00,000+ /mo (12 LPA)');
  });

  // A ceiling's slider narrows as it moves left, so "no ceiling" is last.
  it('runs experience from fresher roles to no ceiling', () => {
    expect(EXPERIENCE_RANGES[0]).toEqual(['0', 'Fresher roles only']);
    expect(EXPERIENCE_RANGES.at(-1)).toEqual(['', 'Any']);
    expect(EXPERIENCE_RANGES.find(([v]) => v === '1')[1]).toBe('Up to 1 year experience');
  });
});
