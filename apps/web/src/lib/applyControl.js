// What the bar under the live page says and offers (ApplyControlStrip.jsx),
// for each state and reason a session can be in (see the server's
// apply/session-state.js; its sentence for each is the view's `message`).
// One bar that always says who has the wheel, with the press that fits.
//
//   { tone, head, actions: [{ id, label, primary }] }
//   tone  'busy' JobDekho has the wheel, 'yours' the person has it,
//         'done' the form is theirs to send, 'stop' the posting is gone
const SIGN_IN = new Set(['sign-in', 'account']);
const WALLS = new Set(['sign-in', 'account', 'code', 'human-check']);

const act = (id, label, primary = false) => ({ id, label, primary });
const WINDOW = act('window', 'Sign in in a normal window');

export function controlFor(view, host = '') {
  const { state, reason } = view;
  if (state === 'starting') return { tone: 'busy', head: 'Opening the application', actions: [] };
  if (state === 'filling') return { tone: 'busy', head: 'JobDekho is filling', actions: [act('takeover', 'Take control', true)] };
  if (reason === 'closed') return { tone: 'stop', head: 'This posting looks closed', actions: [act('close', 'Close')] };
  if (state === 'review') {
    return reason === 'submitted'
      ? { tone: 'done', head: 'Looks submitted', actions: [act('applied', 'Mark as applied', true)] }
      : { tone: 'done', head: 'Review and submit it yourself', actions: [act('fill', 'Fill this page again')] };
  }
  if (reason === 'google-blocked') return { tone: 'yours', head: 'Google will not sign in a driven browser', actions: [{ ...WINDOW, primary: true }] };
  if (SIGN_IN.has(reason)) return { tone: 'yours', head: `${host || 'This site'} wants you to sign in`, actions: [WINDOW, act('fill', 'Continue filling', true)] };
  if (WALLS.has(reason)) return { tone: 'yours', head: 'Your turn', actions: [act('fill', 'Continue filling', true)] };
  // On a job board the person signs in before the form: the window is offered there.
  if (reason === 'click-through') return { tone: 'yours', head: 'Go on to the application', actions: [...(view.board ? [WINDOW] : []), act('fill', 'Fill this page', true)] };
  return { tone: 'yours', head: 'Your turn', actions: [act('fill', 'Fill this page', true)] };
}

// How far the fill has got, for the bar while JobDekho has the wheel: the
// questions with an answer in place, out of every one that counts.
export function progressOf(rows = []) {
  const counted = rows.filter((row) => row.status !== 'skipped');
  const done = counted.filter((row) => ['filled', 'attached', 'done', 'kept'].includes(row.status)).length;
  return { done, total: counted.length };
}

export function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
