import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api.js', () => ({ getPosting: vi.fn() }));

import { getPosting } from '../api.js';
import { loadDescription, cachedDescription, forgetDescriptions } from './fullDescription.js';

beforeEach(() => {
  forgetDescriptions();
  getPosting.mockReset();
});

describe('loadDescription', () => {
  it('fetches a posting once and serves every later ask from memory', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: 'About us\n\n- Ship' });
    expect(cachedDescription('p1')).toBeUndefined();
    const [a, b] = await Promise.all([loadDescription('p1'), loadDescription('p1')]);
    expect(a).toBe('About us\n\n- Ship');
    expect(b).toBe(a);
    expect(await loadDescription('p1')).toBe(a);
    expect(cachedDescription('p1')).toBe(a);
    expect(getPosting).toHaveBeenCalledTimes(1);
  });

  it('remembers a posting with no full text as empty, not as unknown', async () => {
    getPosting.mockResolvedValue({ id: 'p2', descriptionText: null });
    expect(await loadDescription('p2')).toBe('');
    expect(cachedDescription('p2')).toBe('');
  });

  it('does not remember a failure, so the next open tries again', async () => {
    getPosting.mockRejectedValueOnce(new Error('GET -> 500')).mockResolvedValueOnce({ descriptionText: 'Back.' });
    await expect(loadDescription('p3')).rejects.toThrow('500');
    expect(cachedDescription('p3')).toBeUndefined();
    expect(await loadDescription('p3')).toBe('Back.');
  });
});
