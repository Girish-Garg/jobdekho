import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadText } from './downloadText.js';

// jsdom's Blob has no text(); FileReader is how its content is read back.
const readBlob = (blob) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsText(blob);
});

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

describe('downloadText', () => {
  it('offers the text as a plain-text file under the given name, then releases the URL', async () => {
    downloadText('resume-acme.txt', 'Priya Sharma\n- Built it.');
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain;charset=utf-8');
    const click = HTMLAnchorElement.prototype.click;
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.instances[0];
    expect(link.download).toBe('resume-acme.txt');
    expect(link.href).toBe('blob:jobdekho/1');
    expect(document.body.contains(link)).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:jobdekho/1');
    // The reader runs on jsdom's own timers, so it reads once the clock is real again.
    vi.useRealTimers();
    expect(await readBlob(blob)).toBe('Priya Sharma\n- Built it.');
  });
});
