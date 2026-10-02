// A screen's frame clock, driven by hand. A callback waits until a test says
// a frame has come, then runs with the time as a real frame hands it over, so
// animation code runs without a real clock or a real screen. It has the
// requestAnimationFrame pair a window has, for handing to code as its view.
export function frameClock() {
  let time = 0;
  let nextId = 1;
  const waiting = new Map();

  // One frame, `ms` after the last. What it asks for waits for the next one,
  // and what an earlier callback cancels in the meantime never runs, as in a
  // browser.
  const frame = (ms = 16) => {
    time += ms;
    for (const id of [...waiting.keys()]) {
      const callback = waiting.get(id);
      if (!callback) continue;
      waiting.delete(id);
      callback(time);
    }
  };

  return {
    requestAnimationFrame(callback) {
      waiting.set(nextId, callback);
      return nextId++;
    },
    cancelAnimationFrame(id) {
      waiting.delete(id);
    },
    frame,
    frames(count, ms = 16) {
      for (let i = 0; i < count; i += 1) frame(ms);
    },
    // Frames until nothing is waiting; the cap is for a glide that never ends.
    settle(cap = 200) {
      for (let i = 0; i < cap && waiting.size > 0; i += 1) frame();
    },
    get waiting() {
      return waiting.size;
    },
  };
}
