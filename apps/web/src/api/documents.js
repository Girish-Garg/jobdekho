import { send } from '../lib/request.js';
import { req, announced } from './request.js';

// The person's resumes and cover letters, each a LaTeX source they own (see
// apps/server/src/api/documents.js and its two siblings). The compile is
// not announced here: the workspace shows the guard's problems or the
// compile's sentence in the preview itself, where the person is looking.
const path = (id, rest = '') => `/api/documents/${encodeURIComponent(id)}${rest}`;

// [{ id, name, description, kind }], resume layouts and the letter.
export function getDocumentTemplates() {
  return announced(req('/api/documents/templates'), 'Templates').then((d) => d.templates);
}

// Summaries, newest first, never the sources.
export function listDocuments() {
  return announced(req('/api/documents'), 'Documents').then((d) => d.documents);
}

// With `bodies`, every kept version carries its text too.
export function getDocument(id, { bodies = false } = {}) {
  return req(path(id, bodies ? '?bodies=1' : ''));
}

// { kind, templateId, name?, postingId?, fromPlan? }: a first draft from a
// template, made without any AI call.
export function createDocument(body) {
  return req('/api/documents', { method: 'POST', body: JSON.stringify(body) });
}

// { tex, name? }: a new version by the person, or only a rename.
export function saveDocument(id, patch) {
  return req(path(id), { method: 'PUT', body: JSON.stringify(patch) });
}

export function revertDocument(id, at) {
  return req(path(id, '/revert'), { method: 'POST', body: JSON.stringify({ at }) });
}

// The header the person's profile would now write, when the document says
// it differs (`profileHeader`). 'preview' answers { fields, tex } and saves
// nothing; 'apply' saves it as a version, and 'keep' declines it until the
// profile changes again, each answering with the document.
export function documentProfileHeader(id, action) {
  return req(path(id, '/profile-header'), { method: 'POST', body: JSON.stringify({ action }) });
}

export function deleteDocument(id) {
  return req(path(id), { method: 'DELETE' });
}

// The PDF, or an Error carrying the server's sentence, its `kind` and, for
// a source the guard refused, its `problems`.
export async function compileDocument(id) {
  const res = await send(path(id, '/pdf'), { method: 'POST' });
  return res.blob();
}
