// A tailoring's card in the chat asking the Resume page to open its review
// screen (see components/TailorReview.jsx), the way openDocumentSignal.js
// asks it to open a document. The page is usually not mounted yet when this
// is asked, since asking is what takes the person there, so the job waits
// here until a workspace takes it. Only { id, title, company } travels: the
// screen reads the plan itself.
const REQUEST = 'jobdekho:open-tailor-review';

let wanted = null;

export function requestOpenReview(job) {
  wanted = job ? { id: job.id, title: job.title ?? '', company: job.company ?? '' } : null;
  globalThis.dispatchEvent?.(new CustomEvent(REQUEST));
}

// The job waiting, left waiting: what a workspace starts from as it mounts.
// Reading it must change nothing, since React may ask twice for a starting
// state and keep either answer.
export const waitingReview = () => wanted;

// The job waiting, taken: asked from an effect, once the workspace is up,
// so a later visit to the page does not open the same review again.
export function takeReviewRequest() {
  const job = wanted;
  wanted = null;
  return job;
}

export function onReviewRequest(handler, view = globalThis) {
  const listener = () => handler();
  view?.addEventListener?.(REQUEST, listener);
  return () => view?.removeEventListener?.(REQUEST, listener);
}
