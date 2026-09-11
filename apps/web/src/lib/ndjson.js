// Reads the streamed reply of an AI call. The wire shape lives in
// apps/server/src/ai/events.js and is mirrored here rather than imported so
// the bundle stays free of the server: every line carrying an `event` field is
// progress and goes to onEvent the moment it lands; the last line carries none
// and is exactly the body the same request returns without the stream.
export const NDJSON_TYPE = 'application/x-ndjson';

const isEvent = (line) => line !== null && typeof line === 'object' && typeof line.event === 'string';

export async function readNdjson(response, onEvent = () => {}) {
  let last;
  const take = (text) => {
    if (!text.trim()) return;
    last = JSON.parse(text);
    if (isEvent(last)) onEvent(last);
  };
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    // A chunk can end in the middle of a line, so whatever follows the last
    // newline waits for the next chunk before it is parsed.
    let tail = '';
    for (let step = await reader.read(); !step.done; step = await reader.read()) {
      const lines = (tail + decoder.decode(step.value, { stream: true })).split('\n');
      tail = lines.pop();
      lines.forEach(take);
    }
    take(tail + decoder.decode());
  } else {
    // jsdom's Response has no readable body. Read whole, the lines mean the
    // same thing; the progress just arrives all at once, at the end.
    (await response.text()).split('\n').forEach(take);
  }
  return last !== undefined && !isEvent(last) ? last : null;
}
