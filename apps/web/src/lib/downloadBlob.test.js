import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob } from './downloadBlob.js';

// jsdom has no object URLs and no navigation, so both ends of the download
// are stubbed: what the page hands the browser, and the click that asks it.
beforeEach(() => {
  vi.useFakeTimers();
  URL.createObjectURL = vi.fn(() => 'blob:jobdekho/1');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('downloadBlob', () => {
  it('offers the given bytes under the given name, then releases the URL', () => {
    const blob = new Blob(['%PDF-fake']);
    downloadBlob('resume-acme.pdf', blob);
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    const click = HTMLAnchorElement.prototype.click;
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.instances[0];
    expect(link.download).toBe('resume-acme.pdf');
    expect(link.href).toBe('blob:jobdekho/1');
    expect(document.body.contains(link)).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:jobdekho/1');
  });
});
