import { describe, it, expect } from 'vitest';
import { gradePillTone, gradeTone } from './gradeTone.js';

describe('gradePillTone', () => {
  it('fills a picked grade with its own colour, and tints an unpicked one', () => {
    expect(gradePillTone('B', true)).toContain(gradeTone('B').fill);
    expect(gradePillTone('B', false)).toContain(gradeTone('B').text);
  });

  it('gives Any the plain saffron pick every other filter pill has', () => {
    expect(gradePillTone(undefined, true)).toContain('bg-primary');
    expect(gradePillTone(undefined, false)).not.toContain('grade');
  });
});
