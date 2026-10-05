import { send, failure } from './request.js';
import { NDJSON_TYPE, readNdjson } from './ndjson.js';
import { notifyError } from './toast.js';

// One AI call, watched. Asks for the stream (see ndjson.js) so the twenty
// seconds or the several minutes a model takes show as progress rather than
// silence. The stream is always a 200, so a failure arrives as its last line;
// it rejects the way a failed plain call does, with the server's sentence as
// the message and `kind` attached.
//
// `instruction` is a refine and `chatId` the chat a job action was pressed
// in: both ride as a JSON body rather than a query string, since the
// instruction is the person's own words and may run long. Left out, the call
// stays the bodyless POST it always was, content-type included only when
// there is a body to name. `label` names the action for the notice this
// announces on failure: the button that started it already shows the same
// sentence inline, so this is only for the minute or several a model can
// take, during which the person has every reason to be looking elsewhere.
function bodyOf({ instruction, chatId }) {
  const fields = { ...(instruction ? { instruction } : {}), ...(chatId ? { chatId } : {}) };
  return Object.keys(fields).length ? JSON.stringify(fields) : undefined;
}

// `signal` is the caller's own Stop: aborting it drops the request, which
// the server reads as nobody waiting (see its api/profile.js), and the call
// rejects as stopped, the way a stop the server reports does.
export async function streamedPost(url, { onEvent, instruction, chatId, label, signal } = {}) {
  try {
    const headers = { accept: NDJSON_TYPE };
    const body = bodyOf({ instruction, chatId });
    if (body) headers['content-type'] = 'application/json';
    const res = await send(url, { method: 'POST', headers, body, ...(signal ? { signal } : {}) });
    // The 400s and the 401 are plain JSON and have already thrown inside send().
    // A plain 200 body is the same object the stream would have ended with.
    const streamed = (res.headers.get('content-type') || '').includes(NDJSON_TYPE);
    const result = streamed ? await readNdjson(res, onEvent) : await res.json();
    if (!result || result.error) throw failure(result, 'The connection dropped before the answer arrived. Try again.');
    return result;
  } catch (caught) {
    const err = caught?.name === 'AbortError' ? Object.assign(new Error('Stopped.'), { kind: 'stopped' }) : caught;
    // A refusal while another call runs is said in the chat, where the
    // person pressed, and a stop is their own doing: neither is news.
    // `actionable` is safe because every other failure this call can produce
    // is an AI/ProviderError kind (see ai/errors.js), never the LatexError
    // vocabulary notifyError otherwise has to assume nothing about.
    if (err.status !== 409 && err.kind !== 'stopped') notifyError(err, label || 'AI action', { actionable: true });
    throw err;
  }
}
