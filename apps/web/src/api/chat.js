import { req } from './request.js';
import { streamedChatPost } from '../lib/chatStream.js';

export function getChatHistory() {
  return req('/api/chat/history');
}

// Resolves with the turn the server saved: { id, page, question, answer,
// actions, refs, proposals, provider, createdAt } (see packages/store/src/
// chat-history.js). On the Resume page `documentId` names the open document.
export function sendChatMessage(payload, { onEvent } = {}) {
  return streamedChatPost('/api/chat', payload, onEvent);
}

export function clearChatHistory() {
  return req('/api/chat/history', { method: 'DELETE' });
}

// The two buttons on a proposal card. The server applies the proposal it
// saved with the turn, found by id, never anything sent here; the body is
// an empty object only because a JSON POST with no body at all is refused.
// Resolves { proposal, profile } or { proposal, document }.
export function applyProposal(id) {
  return req(`/api/chat/proposals/${encodeURIComponent(id)}/apply`, { method: 'POST', body: '{}' });
}

export function discardProposal(id) {
  return req(`/api/chat/proposals/${encodeURIComponent(id)}/discard`, { method: 'POST', body: '{}' });
}

// The question the server is answering right now, if any, and the last one
// that failed with nobody watching: { pending, failed } (see the server's
// chat/in-flight.js). What a page reloaded mid-answer reads instead of the
// stream it no longer has.
export function getChatPending() {
  return req('/api/chat/pending');
}
