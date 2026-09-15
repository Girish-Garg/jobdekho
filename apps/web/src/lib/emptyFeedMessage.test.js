import { describe, it, expect } from 'vitest';
import { emptyFeedMessage } from './emptyFeedMessage.js';

describe('emptyFeedMessage', () => {
  it('says nothing matches yet when no filter is active', () => {
    expect(emptyFeedMessage([])).toBe('Nothing matches these filters yet.');
  });

  it('names the one active filter', () => {
    expect(emptyFeedMessage([{ label: 'Strong fit' }])).toBe(
      'Nothing matches your Strong fit filter. Try removing it.',
    );
  });

  it('lists every active filter when there is more than one', () => {
    expect(emptyFeedMessage([{ label: 'Strong fit' }, { label: 'Senior' }])).toBe(
      'Nothing matches these filters: Strong fit, Senior. Try removing one.',
    );
  });
});
