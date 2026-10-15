import { req, announced } from './request.js';

// Gmail's connection (see the server's api/mail.js). The app password is
// only ever sent, never read back: every answer is { connected, address,
// keptIn, savedAt, sentToday, cap }, `keptIn` naming where the computer
// keeps the password ('windows', 'keychain', 'secret-service' or 'file').
export function getMail() {
  return announced(req('/api/mail'), 'Gmail');
}

export function connectMail({ address, password }) {
  return req('/api/mail', { method: 'PUT', body: JSON.stringify({ address, password }) });
}

export function disconnectMail() {
  return req('/api/mail', { method: 'DELETE' });
}

// The person's own change to a drafted mail before it goes: any of to,
// subject, body, and attach (a document id or 'none'). Answers { proposal }.
// Sending is the proposal's own apply (see api/chat.js).
export function editMailDraft(id, patch) {
  return req(`/api/chat/proposals/${encodeURIComponent(id)}/mail`, { method: 'PATCH', body: JSON.stringify(patch) });
}
