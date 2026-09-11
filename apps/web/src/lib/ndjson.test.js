import { describe, it, expect, vi } from 'vitest';
import { readNdjson, NDJSON_TYPE } from './ndjson.js';

const EVENTS = [
  { event: 'start', provider: 'claude', path: 'C:\\Users\\me\\AppData\\Roaming\\npm\\claude.cmd' },
  { event: 'progress', stage: 'send', chars: 1200 },
  { event: 'progress', stage: 'wait', elapsedMs: 5000 },
  { event: 'progress', stage: 'reply', elapsedMs: 9000, chars: 210 },
];
const PROFILE = { skills: ['react'], titles: [], locations: ['pune'], years: 1, degree: 'none', resumeName: 'cv.pdf' };
const FAILURE = { error: 'Claude Code did not answer within 120 seconds. Try again.', kind: 'timeout' };

const lines = (...objs) => objs.map((o) => JSON.stringify(o)).join('\n') + '\n';
const encode = (text) => new TextEncoder().encode(text);

// A body that arrives in the given pieces, the way a real fetch delivers it.
function streamed(chunks) {
  const body = new ReadableStream({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encode(c)));
      controller.close();
    },
  });
  return new Response(body, { headers: { 'content-type': NDJSON_TYPE } });
}

// jsdom's Response carries no readable body; this is all the reader gets there.
const whole = (text) => ({ body: null, text: async () => text });

async function collect(response) {
  const events = [];
  const result = await readNdjson(response, (e) => events.push(e));
  return { events, result };
}

describe('readNdjson', () => {
  it('hands every event to the callback and returns the last line as the result', async () => {
    const { events, result } = await collect(streamed([lines(...EVENTS, PROFILE)]));
    expect(events).toEqual(EVENTS);
    expect(result).toEqual(PROFILE);
  });

  it('reads a whole body to the same events and result as a stream', async () => {
    const text = lines(...EVENTS, PROFILE);
    expect(await collect(whole(text))).toEqual(await collect(streamed([text])));
  });

  it('joins a line that arrives split across two chunks', async () => {
    const text = lines(...EVENTS, PROFILE);
    const cut = text.indexOf('"wait"') + 3;
    const { events, result } = await collect(streamed([text.slice(0, cut), text.slice(cut)]));
    expect(events).toEqual(EVENTS);
    expect(result).toEqual(PROFILE);
  });

  it('joins a line split at every byte the same way', async () => {
    const text = lines(...EVENTS, PROFILE);
    const bytes = encode(text);
    const body = new ReadableStream({
      start(controller) {
        bytes.forEach((b) => controller.enqueue(Uint8Array.of(b)));
        controller.close();
      },
    });
    expect(await collect(new Response(body))).toEqual({ events: EVENTS, result: PROFILE });
  });

  it('keeps a multi-byte character whose bytes land in different chunks', async () => {
    const text = lines({ event: 'start', provider: 'claude', path: '/opt/são/claude' }, PROFILE);
    const bytes = encode(text);
    // Everything before the ã is ASCII, so its text index is its byte index,
    // and one past it lands between the two bytes of the character.
    const cut = text.indexOf('ã') + 1;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, cut));
        controller.enqueue(bytes.slice(cut));
        controller.close();
      },
    });
    const { events, result } = await collect(new Response(body));
    expect(events[0].path).toBe('/opt/são/claude');
    expect(result).toEqual(PROFILE);
  });

  it('delivers an event before the stream has ended', async () => {
    let controller;
    const body = new ReadableStream({ start(c) { controller = c; } });
    const onEvent = vi.fn();
    const pending = readNdjson(new Response(body), onEvent);
    controller.enqueue(encode(lines(EVENTS[0])));
    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(EVENTS[0]));
    controller.enqueue(encode(lines(PROFILE)));
    controller.close();
    expect(await pending).toEqual(PROFILE);
  });

  it('returns an { error, kind } last line untouched, so the caller decides', async () => {
    const { events, result } = await collect(streamed([lines(EVENTS[0], EVENTS[1], FAILURE)]));
    expect(events).toEqual([EVENTS[0], EVENTS[1]]);
    expect(result).toEqual(FAILURE);
  });

  it('returns null when the stream ends on an event, like the server reference', async () => {
    expect((await collect(streamed([lines(...EVENTS)]))).result).toBeNull();
    expect((await collect(whole(''))).result).toBeNull();
  });

  it('ignores blank lines and a missing trailing newline', async () => {
    const text = '\n' + JSON.stringify(EVENTS[0]) + '\n\n' + JSON.stringify(PROFILE);
    expect(await collect(streamed([text]))).toEqual({ events: [EVENTS[0]], result: PROFILE });
    expect(await collect(whole(text))).toEqual({ events: [EVENTS[0]], result: PROFILE });
  });
});
