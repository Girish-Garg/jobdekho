import { req, announced } from './request.js';
import { streamedPost } from '../lib/aiCall.js';
import { send } from '../lib/request.js';
import { notePdfLength } from '../lib/pdfLength.js';

// What a failed run of each kind is called in the notice that reports it,
// so the toast names the action rather than a route. Falls back to the raw
// kind for one this list has not caught up with yet.
const ACTION_LABEL = {
  'cover-letter': 'Cover letter',
  'fake-check': 'Is this job real?',
  'resume-tailor': 'Resume tailor',
};

export function getProviders({ refresh = false } = {}) {
  return announced(req(`/api/ai/providers${refresh ? '?refresh=true' : ''}`), 'AI CLIs').then((d) => d.providers);
}

export function getProviderPreference() {
  return announced(req('/api/ai/provider'), 'AI CLI preference');
}

export function putProviderPreference(pref) {
  return req('/api/ai/provider', { method: 'PUT', body: JSON.stringify(pref) });
}

// These stream their progress (see lib/aiCall.js), which also announces a
// failure by `label` - the button that started it already shows its own
// inline error, so the notice is only for the moment the person is not
// watching that panel. The extraction resolves with what the resume says,
// { ranking, basics, proposed }, with nothing saved (see lib/resumeReview.js);
// a posting action with its saved record
// { kind, postingId, provider, createdAt, result, versions }.
export function extractProfile(opts) {
  return streamedPost('/api/profile/extract', { ...opts, label: 'Fill in from resume' });
}

export function runPostingAction(id, kind, opts) {
  return streamedPost(`/api/postings/${id}/ai/${kind}`, { ...opts, label: ACTION_LABEL[kind] || kind });
}

// The review screen of this job's tailoring (see lib/tailorReview.js and the
// server's api/tailor-review.js); none of these calls the AI. The review is
// what the plan did with everything the resume could carry; the choices are
// the person's, saved on the plan, answering with its record; the preview is
// the page the plan now makes, its length noted beside it (lib/pdfLength.js);
// the fit is what could go to bring it to one page, with the lines each saves.
const tailoring = (id, part) => `/api/postings/${id}/ai/resume-tailor/${part}`;

export const getTailorReview = (id) => req(tailoring(id, 'review'));

export const getTailorFit = (id) => req(tailoring(id, 'fit'));

export function putTailorChoices(id, choices) {
  return req(tailoring(id, 'choices'), { method: 'PUT', body: JSON.stringify(choices) });
}

export async function tailorPreview(id) {
  const res = await send(tailoring(id, 'preview'), { method: 'POST' });
  return notePdfLength(await res.blob(), res.headers);
}

export function getPostingAiResults(id) {
  return announced(req(`/api/postings/${id}/ai`), 'Saved AI results').then((d) => d.results);
}
