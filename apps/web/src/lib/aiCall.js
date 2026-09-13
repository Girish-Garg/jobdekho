import { send, failure } from './request.js';
import { NDJSON_TYPE, readNdjson } from './ndjson.js';

// One AI call, watched. Asks for the stream (see ndjson.js) so the twenty
// seconds or the several minutes a model takes show as progress rather than
// silence. The stream is always a 200, so a failure arrives as its last line;
// it rejects the way a failed plain call does, with the server's sentence as
// the message and `kind` attached.
export async function streamedPost(url, { onEvent } = {}) {
  const res = await send(url, { method: 'POST', headers: { accept: NDJSON_TYPE } });
  // The 400s and the 401 are plain JSON and have already thrown inside send().
  // A plain 200 body is the same object the stream would have ended with.
  const streamed = (res.headers.get('content-type') || '').includes(NDJSON_TYPE);
  const body = streamed ? await readNdjson(res, onEvent) : await res.json();
  if (!body || body.error) throw failure(body, 'The connection dropped before the answer arrived. Try again.');
  return body;
}
