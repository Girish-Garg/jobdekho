import { send, failure } from './request.js';
import { NDJSON_TYPE, readNdjson } from './ndjson.js';

// One AI call, watched. Asks for the stream (see ndjson.js) so the twenty
// seconds or the several minutes a model takes show as progress rather than
// silence. The stream is always a 200, so a failure arrives as its last line;
// it rejects the way a failed plain call does, with the server's sentence as
// the message and `kind` attached.
//
// `instruction` is a refine: it rides as a JSON body rather than a query
// string, since it is the person's own words and may run long. Left out, the
// call stays the bodyless POST it always was, content-type included only
// when there is a body to name.
export async function streamedPost(url, { onEvent, instruction } = {}) {
  const headers = { accept: NDJSON_TYPE };
  const body = instruction ? JSON.stringify({ instruction }) : undefined;
  if (body) headers['content-type'] = 'application/json';
  const res = await send(url, { method: 'POST', headers, body });
  // The 400s and the 401 are plain JSON and have already thrown inside send().
  // A plain 200 body is the same object the stream would have ended with.
  const streamed = (res.headers.get('content-type') || '').includes(NDJSON_TYPE);
  const result = streamed ? await readNdjson(res, onEvent) : await res.json();
  if (!result || result.error) throw failure(result, 'The connection dropped before the answer arrived. Try again.');
  return result;
}
