// One chat turn in the shape the panel draws, whichever shape it was saved in.
//
// Today a turn's `answer` is always the answer from JobDekho's own data (its
// postings and the person's profile), and `web` is an object only when the
// web was searched as well: { answer, sources, provider }, drawn after it.
//
// Turns saved before that change put the web answer in `answer`, marked it
// with `web: true` and kept `sources` at the top level. Those were a web
// answer and nothing else, so they come out with no main answer at all rather
// than the web text shown twice.
function cleanSources(sources) {
  if (!Array.isArray(sources)) return [];
  return [...new Set(sources.filter((url) => typeof url === 'string' && url))];
}

function webPart(turn) {
  if (turn.web === true) return { answer: turn.answer ?? '', sources: cleanSources(turn.sources), provider: turn.provider ?? null };
  if (turn.web && typeof turn.web === 'object') {
    return { answer: turn.web.answer ?? '', sources: cleanSources(turn.web.sources), provider: turn.web.provider ?? null };
  }
  return null;
}

export function turnShape(turn = {}) {
  return {
    question: turn.question ?? '',
    answer: turn.web === true ? '' : (turn.answer ?? ''),
    refs: Array.isArray(turn.refs) ? turn.refs : [],
    actions: Array.isArray(turn.actions) ? turn.actions : [],
    provider: turn.provider ?? null,
    createdAt: turn.createdAt ?? null,
    web: webPart(turn),
    webError: typeof turn.webError === 'string' && turn.webError ? turn.webError : null,
  };
}
