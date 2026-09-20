import { send, failure } from './request.js';
import { NDJSON_TYPE, readNdjson } from './ndjson.js';

// One chat turn, watched the way lib/aiCall.js watches a posting action.
// streamedPost there only ever sends a bare `{ instruction }` body, which a
// chat turn does not fit - it also carries the current filters, sort and
// which posting is open - so this is its own small copy of the same three
// rules rather than a change to what every other AI call already relies on.
export async function streamedChatPost(url, body, onEvent = () => {}) {
  const headers = { accept: NDJSON_TYPE, 'content-type': 'application/json' };
  const res = await send(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const streamed = (res.headers.get('content-type') || '').includes(NDJSON_TYPE);
  const result = streamed ? await readNdjson(res, onEvent) : await res.json();
  if (!result || result.error) throw failure(result, 'The connection dropped before the answer arrived. Try again.');
  return result;
}
