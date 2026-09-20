import { send } from '../lib/request.js';
import { req, announced } from './request.js';

// Which templates exist, the person's saved choice of template and entries,
// and the two things it renders to. The .tex never needs a LaTeX install; the
// PDF does, and says so in the server's own words when there is none (see
// apps/server/src/resume). The PDF and .tex calls are announced by
// ResumeBuilderPreview.jsx itself instead of here: that screen already shows
// the server's sentence inline and knows which of the two just ran.
export function getResumeTemplates() {
  return announced(req('/api/resume/templates'), 'Resume templates').then((d) => d.templates);
}

export function getResumeSelection() {
  return announced(req('/api/resume/selection'), 'Resume selection');
}

export function putResumeSelection(selection) {
  return req('/api/resume/selection', { method: 'PUT', body: JSON.stringify(selection) });
}

export async function getResumeTex(selection) {
  const res = await send('/api/resume/tex', { method: 'POST', body: JSON.stringify(selection) });
  return res.text();
}

export async function getResumePdf(selection) {
  const res = await send('/api/resume/pdf', { method: 'POST', body: JSON.stringify(selection) });
  return res.blob();
}
