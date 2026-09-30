import { describe, it, expect } from 'vitest';
import { gradeTone } from './gradeTone.js';

describe('gradeTone', () => {
  it("spells out each grade's classes, so Tailwind finds them in source", () => {
    for (const grade of ['A', 'B', 'C', 'D']) {
      expect(gradeTone(grade).text).toBe(`text-grade-${grade.toLowerCase()}`);
      expect(gradeTone(grade).fill).toBe(`bg-grade-${grade.toLowerCase()}`);
    }
  });

  it('falls back to plain ink for anything else', () => {
    expect(gradeTone('F').text).toBe('text-ink');
    expect(gradeTone(undefined).text).toBe('text-ink');
  });
});
