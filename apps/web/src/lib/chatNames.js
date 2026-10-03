// What a chat is called inside a sentence, as short as it can be said: a
// job's chat by its company ("Razorpay's chat"), a document's by its name,
// a comparison and a general chat by their titles. The view can be missing
// (a call running in a chat this page has not read), and then the stored
// title stands in; a job's ("Frontend Engineer · Razorpay") still gives its
// company.
const DOT = ' · ';
const ANSWERING = 'Answering';

export function companyOfTitle(title = '') {
  const at = String(title ?? '').lastIndexOf(DOT);
  return at === -1 ? '' : title.slice(at + DOT.length);
}

export function chatName(view, fallbackTitle = '') {
  if (view?.kind === 'job') return view.jobs?.[0]?.company || view.jobs?.[0]?.title || companyOfTitle(view.title) || view.title;
  if (view?.kind === 'document') return view.documents?.[0]?.name || view.title;
  if (view) return view.title;
  return companyOfTitle(fallbackTitle) || fallbackTitle || 'another chat';
}

// "Razorpay's chat", "the Razorpay vs Writesonic chat", 'the chat "Which
// remote jobs pay the most?"'.
export function chatPlace(view, fallbackTitle = '') {
  const kind = view?.kind ?? (companyOfTitle(fallbackTitle) ? 'job' : null);
  const name = chatName(view, fallbackTitle);
  if (kind === 'job' || kind === 'document') return `${name}'s chat`;
  if (kind === 'compare') return `the ${name} chat`;
  return `the chat "${name}"`;
}

// Who is at work in the busy chat. A question is "answering", said by the
// CLI that answers, which is how the person thinks of it; an action is its
// own name ("Is it real? is running").
export function busyDoing(busy, cli = '') {
  return busy.label === ANSWERING ? `${cli || 'The AI'} is answering` : `${busy.label} is running`;
}

// The reason every other chat's Send and the job pane's AI buttons give
// while one call runs: one at a time, across every chat.
export const WAIT_FOR_IT = 'You can send once it\'s done.';

export function busyText(busy, view, cli = '') {
  return `${busyDoing(busy, cli)} in ${chatPlace(view, busy.title)}. ${WAIT_FOR_IT}`;
}

// What a finished call made, for the notice that says it is ready.
export function doneWhat(call) {
  if (!call?.label || call.label === ANSWERING) return 'Your answer';
  return call.kind === 'combined' ? call.say ?? call.label : call.label;
}

export function readyTitle(view, call) {
  return `${chatName(view, call?.title)} · ${doneWhat(call)} is ready`;
}

// The header's two lines for the chat on screen: its name, and what kind of
// chat it is, so a question is never ambiguous about what it is asked of.
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function chatHeading(view) {
  if (!view) return { title: 'Ask AI', about: 'Opening the chat...' };
  if (view.kind === 'job') {
    const gone = view.listed === false ? ' · no longer listed' : '';
    return { title: view.jobs[0]?.title || view.title, about: `${view.jobs[0]?.company || 'A job'} · this job's chat${gone}` };
  }
  if (view.kind === 'document') {
    const word = view.documents[0]?.kind === 'cover-letter' ? 'Cover letter' : 'Resume';
    return { title: view.documents[0]?.name || view.title, about: `${word} · this document's chat` };
  }
  if (view.kind === 'compare') return { title: view.title, about: `Comparing ${plural(view.jobs.length, 'job')}` };
  const docs = view.documents.length ? ` · ${plural(view.documents.length, 'document')}` : '';
  return { title: view.title || 'New chat', about: `General chat${docs}` };
}
