import { describe, it, expect } from 'vitest';
import { descriptionBlocks } from './descriptionBlocks.js';

describe('descriptionBlocks', () => {
  it('reads headings, paragraphs and a list out of what stripHtml stores', () => {
    const text = 'HackerRank helps companies hire.\n\nAbout the team\n\nYou will be a key member.\n\nWhat you’ll do\n\n- Drive outbound motion\n- Close deals';
    expect(descriptionBlocks(text)).toEqual([
      { kind: 'paragraph', lead: '', text: 'HackerRank helps companies hire.' },
      { kind: 'heading', text: 'About the team' },
      { kind: 'paragraph', lead: '', text: 'You will be a key member.' },
      { kind: 'heading', text: 'What you’ll do' },
      { kind: 'list', ordered: false, items: [
        { number: null, lead: '', text: 'Drive outbound motion' },
        { number: null, lead: '', text: 'Close deals' },
      ] },
    ]);
  });

  it('takes a short line ending in a colon as a heading, and drops the colon', () => {
    const [heading, list] = descriptionBlocks('What you will need:\n- 3-6 years of Fin-Tech');
    expect(heading).toEqual({ kind: 'heading', text: 'What you will need' });
    expect(list.items[0].text).toBe('3-6 years of Fin-Tech');
  });

  it('takes a line in capitals as a heading', () => {
    expect(descriptionBlocks('ABOUT POSTHOG\nWe ship.')[0]).toEqual({ kind: 'heading', text: 'ABOUT POSTHOG' });
  });

  it('does not take a sentence, a long line or a lone place name for a heading', () => {
    const kinds = descriptionBlocks('Apply today.\n\nBangalore, India\n\nWe are looking for an accomplished sales professional to own it all')
      .map((block) => block.kind);
    expect(kinds).toEqual(['paragraph', 'paragraph', 'paragraph']);
  });

  it('keeps one list across the blank lines some boards put between items', () => {
    const blocks = descriptionBlocks(' - One\n\n - Two\n\n• Three');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].items.map((item) => item.text)).toEqual(['One', 'Two', 'Three']);
  });

  it('joins a wrapped line to the item above it', () => {
    const [list] = descriptionBlocks('● Utilize open source tools, with an emphasis on cloud\nservices.\n● Communicate well.');
    expect(list.items.map((item) => item.text)).toEqual(['Utilize open source tools, with an emphasis on cloud services.', 'Communicate well.']);
  });

  it('makes a counting list ordered, and a short standalone numbered line a heading', () => {
    const blocks = descriptionBlocks('1. Product-led. Installed by 450,000 teams.\n2. Default alive. Revenue grows.\n\n2. Partner Activation & Readiness\n\n- Own the activation');
    expect(blocks[0]).toMatchObject({ kind: 'list', ordered: true });
    expect(blocks[1]).toEqual({ kind: 'heading', text: '2. Partner Activation & Readiness' });
    expect(blocks[2]).toMatchObject({ kind: 'list', ordered: false });
  });

  it('sets a short label apart from the text it introduces', () => {
    expect(descriptionBlocks('- Transparency: Everyone can read the roadmap.')[0].items[0])
      .toEqual({ number: null, lead: 'Transparency:', text: 'Everyone can read the roadmap.' });
    expect(descriptionBlocks('Visit https://x.com: it is new.')[0].lead).toBe('');
  });

  it('returns nothing for an empty body', () => {
    expect(descriptionBlocks('')).toEqual([]);
    expect(descriptionBlocks(null)).toEqual([]);
  });
});
