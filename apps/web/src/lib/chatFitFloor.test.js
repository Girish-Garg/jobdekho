import { describe, it, expect } from 'vitest';
import { chatFitFloor } from './chatFitFloor.js';

describe('chatFitFloor', () => {
  it('keeps a floor that is one of today\'s', () => {
    expect(chatFitFloor('55', 'Show grade A')).toBe('55');
    expect(chatFitFloor('40')).toBe('40');
  });

  // The button said a letter; the letter is what it applies.
  it('applies the letter a kept button showed, at today\'s floor for it', () => {
    expect(chatFitFloor('62', 'Show mid level, grade A')).toBe('55');
    expect(chatFitFloor('50', 'Show grade B or better')).toBe('40');
    expect(chatFitFloor('38', 'Show grade C or better')).toBe('25');
  });

  // 25 was D and is C now: only the label can say which it meant.
  it('reads an ambiguous number by its label', () => {
    expect(chatFitFloor('25', 'Show grade D or better')).toBe('12');
    expect(chatFitFloor('25', 'Show grade C or better')).toBe('25');
  });

  it('reads an unlabelled old number against the earlier floors', () => {
    expect(chatFitFloor('62')).toBe('55');
    expect(chatFitFloor('50')).toBe('40');
    // The pre-grade "Good fit" floor sat in the old C band.
    expect(chatFitFloor('44')).toBe('25');
  });

  it('leaves a clear, or a number below every floor, as it is', () => {
    expect(chatFitFloor('')).toBe('');
    expect(chatFitFloor(null)).toBeNull();
    expect(chatFitFloor('5')).toBe('5');
  });
});
