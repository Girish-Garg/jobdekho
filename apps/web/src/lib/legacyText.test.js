import { describe, it, expect } from 'vitest';
import { decodeEntities, legacyText } from './legacyText.js';
import { descriptionBlocks } from './descriptionBlocks.js';

// A stored SmartRecruiters row from before the structure-keeping scrape, as
// the owner saw it in the pane (shortened).
const FLAT = 'Our clients rely on Connect data and insights to innovate and grow.&#xa0; As a Test Automation Engineer specializing in JAVA/Python and Selenium, you will play a crucial role in ensuring the quality and reliability of our software products. You will lead the development and implementation of automated&#xa0;test, contributing to the enhancement of our testing processes and frameworks.&#xa0; Develop and build scalable automation frameworks and test&#xa0;suites working&#xa0;across technologies.&#xa0; Deploy application components using CI/CD&#xa0;pipelines.&#xa0; 3-8&#xa0;Years of applicable software engineering experience&#xa0;&#xa0; Must&#xa0;have SQL knowledge.';

describe('decodeEntities', () => {
  it('decodes named and numeric entities, one escape inside another included', () => {
    expect(decodeEntities('L&amp;D, PhonePe&#39;s, You&#x2019;ll, a&#xa0;b, x&amp;#xa0;y')).toBe('L&D, PhonePe\'s, You’ll, a b, x y');
  });

  it('leaves the angle brackets escaped, and anything it does not know', () => {
    expect(decodeEntities('&lt;p&gt; &#60; &madeup;')).toBe('&lt;p&gt; &#60; &madeup;');
  });
});

describe('legacyText', () => {
  it('finds the lost list items and paragraphs in a flat row, and leaves no entity behind', () => {
    const text = legacyText(FLAT);
    expect(text).not.toMatch(/&#| /);
    const blocks = descriptionBlocks(text);
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'paragraph', 'list']);
    expect(blocks[1].text).toMatch(/^As a Test Automation Engineer .* automated test, contributing .* frameworks\.$/);
    expect(blocks[2].items.map((i) => i.text)).toEqual([
      'Develop and build scalable automation frameworks and test suites working across technologies.',
      'Deploy application components using CI/CD pipelines.',
      '3-8 Years of applicable software engineering experience',
      'Must have SQL knowledge.',
    ]);
  });

  it('keeps a short label on its own line, where it reads as a heading', () => {
    const blocks = descriptionBlocks(legacyText('Intro sentence here.&#xa0; WHAT YOU&#x2019;LL DO:&#xa0; Build things.&#xa0; Ship them.'));
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'heading', 'list']);
  });

  it('leaves text that already has its structure alone, beyond the entities', () => {
    expect(legacyText('About us\n\n- Build&#xa0; things\n- Ship')).toBe('About us\n\n- Build  things\n- Ship');
    expect(legacyText('One plain line.')).toBe('One plain line.');
  });
});
