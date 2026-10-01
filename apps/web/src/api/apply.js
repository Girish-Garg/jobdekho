import { req } from './request.js';
import { streamedChatPost } from '../lib/chatStream.js';

// Apply assist's REST side (the server's api/apply-sessions.js and
// api/apply-copy.js). The live view itself travels over the session's socket
// (lib/applySocket.js); these open and close it and carry the presses.
const session = (id) => `/api/apply/sessions/${encodeURIComponent(id)}`;
const post = (url, body) => req(url, { method: 'POST', body: JSON.stringify(body ?? {}) });

// { browser: { name } | null, canPopOut }
export function getApplyBrowser() {
  return req('/api/apply/browser');
}

// { session, token }. A second open answers 409 with the one already open.
export function openApply(postingId) {
  return post('/api/apply/sessions', { postingId });
}

export function currentApply() {
  return req('/api/apply/sessions/current');
}

export function closeApply(id) {
  return req(session(id), { method: 'DELETE' });
}

// "Fill this page": always a press of the person's.
export function fillApply(id) {
  return post(`${session(id)}/fill`);
}

export function takeOverApply(id) {
  return post(`${session(id)}/takeover`);
}

export function showApplyWindow(id, shown) {
  return post(`${session(id)}/window`, { shown });
}

// { rows: [{ label, value }], coverLetter, hasResume }, with no browser
// needed at all.
export function getApplyCopy(postingId) {
  return req(`/api/apply/copy/${encodeURIComponent(postingId)}`);
}

// The resume PDF the person uploaded, to attach to a form by hand.
export const APPLY_RESUME_URL = '/api/apply/resume';

// A message to the AI beside the form: resolves with { reply, filled: [{
// label, result }] }, its words streaming to onEvent as they are written
// (see lib/chatStream.js). One at a time; stopApplyAsk ends it.
export function askApply(id, message, onEvent) {
  return streamedChatPost(`${session(id)}/ask`, { message }, onEvent);
}

export function stopApplyAsk(id) {
  return post(`${session(id)}/ask/stop`);
}

// The normal window to sign in from (see the server's apply/sign-in-window.js):
// opening it ends the application's browser and answers { open, url }; the
// state says whether it is still open; closing asks it to close.
export function openSignInWindow(id) {
  return post(`${session(id)}/sign-in-window`);
}

export function signInWindowState() {
  return req('/api/apply/sign-in-window');
}

export function closeSignInWindow() {
  return req('/api/apply/sign-in-window', { method: 'DELETE' });
}

// Signs Apply assist's browser out of every site it kept a sign-in for. 409
// while an application is open in it.
export function clearApplySignIns() {
  return req('/api/apply/sign-ins', { method: 'DELETE' });
}

export const applyFileUrl = (id, kind) => `${session(id)}/files/${kind}`;

export const applySocketUrl = (id, location = window.location) =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${session(id)}/socket`;
