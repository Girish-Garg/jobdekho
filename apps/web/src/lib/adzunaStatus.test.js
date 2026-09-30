import { describe, it, expect } from 'vitest';
import { keyStatus, lastRunStatus } from './adzunaStatus.js';

const view = (over) => ({ configured: true, from: 'settings', appId: 'id', keyEnd: '1a2b', lastRun: null, ...over });

describe('keyStatus', () => {
  it('says it is looking, could not look, or found no key', () => {
    expect(keyStatus(undefined)).toMatchObject({ tone: 'muted', text: expect.stringMatching(/Looking/) });
    expect(keyStatus(null)).toMatchObject({ tone: 'error' });
    expect(keyStatus(view({ configured: false, from: null, keyEnd: null }))).toEqual({ tone: 'muted', text: 'No key yet, so refreshes leave Adzuna out.' });
  });

  it('names the key by its last four and says where it came from', () => {
    expect(keyStatus(view()).text).toBe('Key ending 1a2b, from Settings');
    expect(keyStatus(view({ from: 'environment', keyEnd: '9z9z' })).text).toBe('Key ending 9z9z, from the environment (.env)');
  });

  it('does without the last four when the server sent none', () => {
    expect(keyStatus(view({ keyEnd: null })).text).toBe('Key saved, from Settings');
  });
});

describe('lastRunStatus', () => {
  it('is nothing when the last refresh had no Adzuna in it', () => {
    expect(lastRunStatus(null)).toBeNull();
  });

  it('counts what Adzuna brought', () => {
    expect(lastRunStatus({ at: null, ok: true, count: 42, error: null }).text).toBe('Last refresh: 42 postings from Adzuna.');
    expect(lastRunStatus({ at: null, ok: true, count: 1, error: null }).text).toBe('Last refresh: 1 posting from Adzuna.');
  });

  it('says it failed, with the error to hover over', () => {
    const out = lastRunStatus({ at: '2026-09-30T08:35:00.000Z', ok: false, count: 0, error: 'HTTP 401' });
    expect(out).toMatchObject({ tone: 'error', title: 'HTTP 401' });
    expect(out.text).toMatch(/^Last refresh, .+: Adzuna failed\.$/);
  });
});
