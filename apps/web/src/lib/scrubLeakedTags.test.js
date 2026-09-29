import { describe, it, expect } from 'vitest';
import { scrubLeakedTags, hasLeakedTags } from './scrubLeakedTags.js';

// Fragments copied from the 147 stored Greenhouse rows that still carry the
// markup the scraper leaked before 2026-09-11.
const PHONEPE = 'div class= content-intro p strong About PhonePe Limited: /strong /p p Headquartered in India, its flagship product was launched in Aug 2016. /p p /p';

describe('scrubLeakedTags', () => {
  it('turns the leaked opening of a real row into a heading line and a paragraph', () => {
    expect(scrubLeakedTags(PHONEPE)).toBe('About PhonePe Limited:\n\nHeadquartered in India, its flagship product was launched in Aug 2016.');
  });

  it('turns leaked list markup into "- " lines', () => {
    const body = 'p strong Must Haves: /strong /p ul li p Advanced SQL /p /li li p Hands-on with Spark /p /li /ul p Apply now. /p';
    expect(scrubLeakedTags(body)).toBe('Must Haves:\n\n- Advanced SQL\n- Hands-on with Spark\n\nApply now.');
  });

  it('removes attributes with their values: style declarations, classes, links, data blobs', () => {
    const body = 'p span style= font-family: arial, helvetica, sans-serif; font-size: small; Stripe builds. /span /p '
      + 'p a href= https://saas.group target= _blank saas.group /a /p '
      + 'p span data-ccp-props= { 335559685 :720, 335559991 :720} /span span class= il native /span apis /p';
    expect(scrubLeakedTags(body)).toBe('Stripe builds.\n\nsaas.group\n\nnative apis');
  });

  it('keeps "strong", "span" and "a" where a leaked body uses them as words', () => {
    const body = 'p You have strong skills and a team to span. /p ul li strong Grit /strong - a strong drive /li /ul';
    expect(scrubLeakedTags(body)).toBe('You have strong skills and a team to span.\n\n- Grit - a strong drive');
  });

  it('removes an inline bold tag mid-sentence once its closer shows it was a tag', () => {
    expect(scrubLeakedTags('p you will strong architect the platform /strong from day one. /p'))
      .toBe('you will architect the platform from day one.');
  });

  // A snippet stops at 280 characters, before the closer.
  it('removes a lowercase strong opening a block even when its closer was cut off', () => {
    expect(scrubLeakedTags('/li li strong Parental Support - Maternity')).toBe('- Parental Support - Maternity');
  });

  it('drops a closer cut in half at the end of the stored text', () => {
    expect(scrubLeakedTags('ul li p Translate needs into specs /p /l')).toBe('- Translate needs into specs');
  });

  it('returns a clean body exactly as it came, "p99 latency" and all', () => {
    const clean = 'Own p99 latency for the p service.\n\n- strong communication skills\n- a span of teams';
    expect(hasLeakedTags(clean)).toBe(false);
    expect(scrubLeakedTags(clean)).toBe(clean);
  });

  it('survives an empty or missing body', () => {
    expect(scrubLeakedTags('')).toBe('');
    expect(scrubLeakedTags(null)).toBe('');
  });
});
