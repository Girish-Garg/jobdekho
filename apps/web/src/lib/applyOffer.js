// Which postings get Apply assist: every one with a web address, job boards
// included. The person picks the one application, signs in themselves where
// a site asks, and submits it themselves; what a board's own terms say about
// tools is shown in the panel (the server's boardNote, see
// apply/apply-url.js, which is also the check that counts).
export function offersApply(posting) {
  return Boolean(posting?.url) && /^https?:\/\//i.test(posting.url);
}
