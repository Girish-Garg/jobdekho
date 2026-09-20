import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getResumeTemplates, getResumeSelection, putResumeSelection, getResumeTex, getResumePdf,
} from './api.js';

// A separate file from api.test.js (which the fit-scoring work is also
// editing) purely to avoid the two changes colliding; same mockFetch shape,
// extended with text()/blob() for the two endpoints that do not answer JSON.
function mockFetch({ body, text, blob, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => text,
    blob: async () => blob,
  });
  global.fetch = fn;
  return fn;
}

beforeEach(() => vi.restoreAllMocks());

describe('resume api calls', () => {
  it('getResumeTemplates unwraps the templates array', async () => {
    mockFetch({ body: { templates: [{ id: 'classic' }] } });
    expect(await getResumeTemplates()).toEqual([{ id: 'classic' }]);
  });

  it('getResumeSelection reads the saved choice', async () => {
    const fetchMock = mockFetch({ body: { template: 'compact', sections: {} } });
    expect(await getResumeSelection()).toEqual({ template: 'compact', sections: {} });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/resume/selection');
  });

  it('putResumeSelection PUTs the selection as JSON', async () => {
    const fetchMock = mockFetch({ body: { template: 'classic', sections: {} } });
    await putResumeSelection({ template: 'classic', sections: { experience: ['e1'] } });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/resume/selection');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ template: 'classic', sections: { experience: ['e1'] } });
  });

  it('getResumeTex POSTs the selection and returns the .tex source as text', async () => {
    const fetchMock = mockFetch({ text: '\\documentclass{article}' });
    const tex = await getResumeTex({ template: 'classic', sections: {} });
    expect(tex).toBe('\\documentclass{article}');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/resume/tex');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('getResumePdf POSTs the selection and returns the PDF as a blob', async () => {
    const pdf = new Blob(['%PDF-fake']);
    const fetchMock = mockFetch({ blob: pdf });
    const result = await getResumePdf({ template: 'classic', sections: {} });
    expect(result).toBe(pdf);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/resume/pdf');
  });

  // The server writes the install sentence for a person to read; the client
  // just has to carry it and the kind through, same as every other AI/LaTeX
  // failure this app surfaces (see lib/request.js's failure()).
  it('getResumePdf surfaces the server error message and kind on failure', async () => {
    mockFetch({ body: { error: 'No LaTeX installation was found.', kind: 'not_found' }, status: 503 });
    await expect(getResumePdf({ template: 'classic', sections: {} })).rejects.toMatchObject({
      message: 'No LaTeX installation was found.', kind: 'not_found',
    });
  });
});
