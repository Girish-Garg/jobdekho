// The three things the chat can do to the job it is scoped to, each the same
// posting action the server has always run (POST /api/postings/:id/ai/:kind,
// see apps/server/src/actions). What differs between them for the panel:
//
//   label    the quick action button, and the line the conversation shows
//            for a first run
//   again    the button once an answer is saved, so a job already checked
//            never costs a second call because the same words were clicked
//   name     what a result card and the "Changing:" chip call it
//   ask      the input's placeholder while that card is the reply target
//   policy   the tool policy its server twin runs under (see providerFor.js):
//            a browser for the fake check, which only ever sees the posting,
//            and none at all for the two that carry the resume
//   noun, doing   the progress line's words (see aiProgress.js)
//   intro    the install hint's first sentence when no CLI can take it
export const ACTION_KINDS = {
  'fake-check': {
    label: 'Is it real?', again: 'Check again', name: 'Is it real?', policy: 'web',
    ask: 'What should the check look into again?',
    noun: 'Posting', doing: 'checking the web',
    intro: 'Checking whether a job is real asks an AI CLI installed on this computer, on your own subscription or a local model.',
  },
  'cover-letter': {
    label: 'Write a cover letter', again: 'Write again', name: 'Cover letter', policy: 'none',
    ask: 'What should change in the letter?',
    noun: 'Posting', doing: 'writing',
    intro: 'Writing a cover letter asks an AI CLI installed on this computer, on your own subscription or a local model.',
  },
  'resume-tailor': {
    label: 'Tailor my resume', again: 'Tailor again', name: 'Tailored resume', policy: 'none',
    ask: 'What should change in the tailored resume?',
    noun: 'Career record', doing: 'picking your best entries',
    intro: 'Tailoring your resume asks an AI CLI installed on this computer, on your own subscription or a local model.',
  },
};

// The order the buttons sit in: doubt first, then the two that act on it.
export const ACTION_ORDER = ['fake-check', 'cover-letter', 'resume-tailor'];

// A plain question needs no browser, so the chat itself runs under 'none'.
export const CHAT_POLICY = 'none';
export const CHAT_INTRO = 'The chat asks an AI CLI installed on this computer, on your own subscription or a local model.';

// A posting the feed already warns about is one the person is asking "is
// this real?" about, so that is what the pane offers to start with.
export function isDoubtful(posting) {
  return posting?.legitimacy === 'low' || posting?.legitimacy === 'suspicious';
}
