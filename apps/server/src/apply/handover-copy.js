// What the banner over the live view says after its bold head (the panel's
// ApplyBanner: Opening, Filling, Your turn, Review and submit it yourself,
// This posting looks closed, Looks submitted), one sentence per state and
// reason, never repeating the head. Kept on the server beside the states
// they describe, so the panel can never tell a different story about the
// same pause.
const BY_STATE = {
  starting: 'The application is loading in a browser of its own.',
  filling: 'JobDekho is entering what it knows from your profile.',
  closed: 'The application window has closed.',
}

const BY_REASON = {
  'sign-in': 'This site wants you to sign in. JobDekho never types passwords: sign in in the window, then press Continue filling. To sign in with Google, use a normal window.',
  'google-blocked': 'Google does not sign anyone in from a browser that software drives. Open a normal window, sign in to the site there (Google works), and close it: Apply assist carries on signed in.',
  account: 'This site wants a new account. Making it is yours to do: JobDekho never creates accounts or picks passwords. Once you are in, press Continue filling.',
  code: 'The site sent you a code. Enter it in the window yourself, then press Continue filling.',
  'human-check': 'The site is checking that you are human. JobDekho does not answer these: work through it in the window, or open the posting in your own browser.',
  closed: 'It no longer takes applications, or its page could not be found.',
  'click-through': 'This is the job\'s page, not the application form. Press Apply in the window, and sign in if the site asks; once the form is open, press Fill this page.',
  'check-page': 'This page is filled as far as JobDekho can go. Check it and answer what is left, then press the site\'s own Next. On the next page, press Fill this page.',
  'took-over': 'JobDekho has stopped filling. Press Fill this page when you want it back.',
  review: 'JobDekho has not pressed Submit and never will.',
  submitted: 'If it went through, mark this job as applied.',
}

export function sentenceFor(state, reason) {
  if (state === 'yours' || state === 'review') return BY_REASON[reason] ?? BY_REASON.review
  return BY_STATE[state] ?? ''
}
