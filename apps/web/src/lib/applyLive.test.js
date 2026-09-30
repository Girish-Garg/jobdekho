import { describe, it, expect, vi } from 'vitest';
import { keyMessage } from './applyKeys.js';
import { toPage, toView } from './applyPoint.js';
import { offersApply, appliesOnBoard, boardOf } from './applyOffer.js';
import { connectApply } from './applySocket.js';
import { sameView } from './applyFrames.js';

const key = (over) => ({ key: 'a', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, ...over });

describe('keyMessage', () => {
  it('sends named keys and editing chords, and leaves text to the input events', () => {
    expect(keyMessage(key({ key: 'Backspace' }))).toEqual({ t: 'key', name: 'Backspace', mods: { ctrl: false, meta: false, shift: false, alt: false } });
    expect(keyMessage(key({ key: 'Tab', shiftKey: true })).mods.shift).toBe(true);
    expect(keyMessage(key({ key: 'A', ctrlKey: true }))).toMatchObject({ name: 'a', mods: { ctrl: true } });
    expect(keyMessage(key({ key: 'a' }))).toBeNull();
    expect(keyMessage(key({ key: 'न' }))).toBeNull();
  });

  it('never sends paste, browser shortcuts, or keys the IME is composing', () => {
    expect(keyMessage(key({ key: 'v', ctrlKey: true }))).toBeNull();
    expect(keyMessage(key({ key: 'F12' }))).toBeNull();
    expect(keyMessage(key({ key: 't', ctrlKey: true }))).toBeNull();
    expect(keyMessage(key({ key: 'Enter', isComposing: true }))).toBeNull();
  });
});

describe('toPage and toView', () => {
  const box = { left: 100, top: 50, width: 640, height: 400 };
  const frame = { w: 1280, h: 800, sx: 0, sy: 300 };

  it('carries a press across as a ratio of the picture', () => {
    expect(toPage(box, 420, 250, frame)).toEqual({ x: 640, y: 400 });
    expect(toPage(box, 100, 50, frame)).toEqual({ x: 0, y: 0 });
  });

  it('places a field read in page pixels onto the scrolled, scaled picture', () => {
    expect(toView({ x: 200, y: 500, w: 400, h: 40 }, frame, 640)).toEqual({ left: 100, top: 100, width: 200, height: 20 });
  });

  it('knows when a picture moved', () => {
    expect(sameView(frame, { ...frame })).toBe(true);
    expect(sameView(frame, { ...frame, sy: 0 })).toBe(false);
    expect(sameView(null, frame)).toBe(false);
  });
});

describe('offersApply', () => {
  it('is offered on company sites, ATS boards and aggregators, never inside a board applied to signed in', () => {
    expect(offersApply({ source: 'greenhouse:groww', url: 'https://job-boards.greenhouse.io/groww/jobs/1' })).toBe(true);
    expect(offersApply({ source: 'amazon', url: 'https://amazon.jobs/x' })).toBe(true);
    expect(offersApply({ source: 'arbeitnow', url: 'https://www.arbeitnow.com/jobs/x' })).toBe(true);
    expect(offersApply({ source: 'linkedin', url: 'https://in.linkedin.com/jobs/view/1' })).toBe(false);
    expect(offersApply({ source: 'internshala', url: 'https://internshala.com/job/1' })).toBe(false);
    expect(offersApply({ source: 'lever:x', url: '' })).toBe(false);
  });

  // Those get the details laid out to paste, named for the board.
  it('names the board a posting is applied on signed in', () => {
    expect(appliesOnBoard({ source: 'internshala', url: 'https://internshala.com/job/1' })).toBe(true);
    expect(boardOf({ source: 'instahyre', url: 'https://www.instahyre.com/job-1' })).toBe('Instahyre');
    expect(appliesOnBoard({ source: 'greenhouse:groww', url: 'https://job-boards.greenhouse.io/groww/jobs/1' })).toBe(false);
    expect(appliesOnBoard({ source: 'linkedin', url: '' })).toBe(false);
  });
});

// A socket the test drives: what was sent, and a way to answer.
function fakeSocket() {
  const made = [];
  class Socket {
    constructor(url) {
      this.url = url;
      this.sent = [];
      this.readyState = 1;
      made.push(this);
    }
    send(data) { this.sent.push(data); }
    close() { this.readyState = 3; }
  }
  return { Socket, made };
}

describe('connectApply', () => {
  it('says hello with the token first, then pairs each frame header with its picture', () => {
    const { Socket, made } = fakeSocket();
    const onView = vi.fn();
    const onFrame = vi.fn();
    const link = connectApply({ url: 'ws://x/s', token: 'secret', onView, onFrame, Socket });
    const socket = made[0];
    socket.onopen();
    expect(JSON.parse(socket.sent[0])).toEqual({ t: 'hello', token: 'secret' });
    socket.onmessage({ data: JSON.stringify({ t: 'view', view: { id: 's1' } }) });
    socket.onmessage({ data: JSON.stringify({ t: 'frame', seq: 1, w: 1280, h: 800 }) });
    socket.onmessage({ data: new Blob(['jpeg']) });
    expect(onView).toHaveBeenCalledWith({ id: 's1' });
    expect(onFrame.mock.calls[0][0]).toMatchObject({ seq: 1, w: 1280 });
    link.send({ t: 'text', text: 'नमस्ते' });
    expect(JSON.parse(socket.sent[1])).toEqual({ t: 'text', text: 'नमस्ते' });
  });

  it('retries a dropped connection but not a refused token', () => {
    vi.useFakeTimers();
    const { Socket, made } = fakeSocket();
    const onClosed = vi.fn();
    connectApply({ url: 'ws://x/s', token: 't', onView: vi.fn(), onFrame: vi.fn(), onClosed, Socket });
    made[0].onclose({ code: 1006 });
    vi.advanceTimersByTime(600);
    expect(made).toHaveLength(2);
    made[1].onclose({ code: 4001 });
    vi.advanceTimersByTime(10000);
    expect(made).toHaveLength(2);
    expect(onClosed).toHaveBeenCalledWith(4001);
    vi.useRealTimers();
  });
});
