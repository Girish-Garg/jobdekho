import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api.js', () => ({ getPosting: vi.fn(), describePosting: vi.fn() }));

import { getPosting, describePosting } from '../api.js';
import { loadDetail, cachedDetail, describeDetail, describeRefusal, hasText, forgetDetails } from './postingDetails.js';
import { onDescribed } from './postingDescribedSignal.js';

const refused = (status, message) => Object.assign(new Error(message), { status });

beforeEach(() => {
  forgetDetails();
  getPosting.mockReset();
  describePosting.mockReset();
});

describe('loadDetail', () => {
  it('fetches a posting once and serves every later ask from memory', async () => {
    getPosting.mockResolvedValue({ id: 'p1', descriptionText: 'About us\n- Ship', sections: null });
    expect(cachedDetail('p1')).toBeUndefined();
    const [a, b] = await Promise.all([loadDetail('p1'), loadDetail('p1')]);
    expect(b).toBe(a);
    expect(await loadDetail('p1')).toBe(a);
    expect(cachedDetail('p1')).toBe(a);
    expect(getPosting).toHaveBeenCalledTimes(1);
  });

  it('does not remember a failure, so the next open tries again', async () => {
    getPosting.mockRejectedValueOnce(new Error('GET -> 500')).mockResolvedValueOnce({ id: 'p3', descriptionText: 'Back.' });
    await expect(loadDetail('p3')).rejects.toThrow('500');
    expect(cachedDetail('p3')).toBeUndefined();
    expect((await loadDetail('p3')).descriptionText).toBe('Back.');
  });

  it('tells a posting with text from one without', () => {
    expect(hasText({ descriptionText: 'Ship it.' })).toBe(true);
    expect(hasText({ descriptionText: '  ' })).toBe(false);
    expect(hasText(null)).toBe(false);
    // A board's first line only (the server's descriptionPartial).
    expect(hasText({ descriptionText: 'As an intern you will', descriptionPartial: true })).toBe(false);
  });
});

describe('describeDetail', () => {
  it('asks once for two opens at once, keeps the described posting and tells the feed', async () => {
    const described = { id: 'p1', descriptionText: 'Now there is text.', level: 'senior' };
    describePosting.mockResolvedValue({ posting: described, described: true });
    const heard = vi.fn();
    const stop = onDescribed(heard);
    const [a, b] = await Promise.all([describeDetail('p1'), describeDetail('p1')]);
    stop();
    expect(a).toBe(described);
    expect(b).toBe(described);
    expect(describePosting).toHaveBeenCalledTimes(1);
    expect(cachedDetail('p1')).toBe(described);
    expect(heard).toHaveBeenCalledWith(described);
  });

  // Never in a loop: a refusal stands for the rest of the session.
  it('keeps a refusal, with the server sentence, and does not ask again', async () => {
    describePosting.mockRejectedValue(refused(429, 'LinkedIn asked JobDekho to slow down, so it is left alone until 6 Oct.'));
    await expect(describeDetail('p2')).rejects.toEqual({ status: 429, message: 'LinkedIn asked JobDekho to slow down, so it is left alone until 6 Oct.' });
    expect(describeRefusal('p2')).toEqual({ status: 429, message: 'LinkedIn asked JobDekho to slow down, so it is left alone until 6 Oct.' });
  });

  // Turning LinkedIn on in Settings changes the answer, so that one alone
  // is asked again on the next open.
  it('does not keep LinkedIn being switched off', async () => {
    describePosting.mockRejectedValue(refused(403, 'LinkedIn is switched off in Settings.'));
    await expect(describeDetail('p4')).rejects.toMatchObject({ status: 403 });
    expect(describeRefusal('p4')).toBeNull();
  });

  it('keeps no words but the server sentences it wrote to be shown', async () => {
    describePosting.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(describeDetail('p5')).rejects.toEqual({ status: null, message: '' });
  });
});
