import { req } from './request.js';
import { streamedChatPost } from '../lib/chatStream.js';

// The current conversation: { id, turns }. `id` is null only for one no
// question has been asked in since conversations had ids.
export function getChatHistory() {
  return req('/api/chat/history');
}

// Resolves with the turn the server saved: { id, page, question, answer,
// actions, refs, proposals, provider, createdAt, conversationId } (see
// packages/store/src/chat-history.js). On the Resume page `documentId`
// names the open document.
export function sendChatMessage(payload, { onEvent } = {}) {
  return streamedChatPost('/api/chat', payload, onEvent);
}

// "Start a new one": the server files the current conversation away and
// answers the fresh one, { id, turns: [], filed }. The empty object body is
// only because a JSON POST with no body at all is refused.
export function startNewConversation() {
  return req('/api/chat/conversations', { method: 'POST', body: '{}' });
}

// The conversations filed away, newest first: [{ id, title, startedAt,
// endedAt, turnCount }].
export function listConversations() {
  return req('/api/chat/conversations').then((d) => d.conversations);
}

export function getConversation(id) {
  return req(`/api/chat/conversations/${encodeURIComponent(id)}`);
}

// Makes a filed conversation the current one again, filing the current one
// in its place. Resolves the new current one, { id, turns }.
export function continueConversation(id) {
  return req(`/api/chat/conversations/${encodeURIComponent(id)}/continue`, { method: 'POST', body: '{}' });
}

export function deleteConversation(id) {
  return req(`/api/chat/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Everything the AI made, newest first (see the server's chat/made-by-ai.js).
export function getMadeByAi() {
  return req('/api/chat/made-by-ai').then((d) => d.items);
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
// stream it no longer has. `pending.conversationId` is the conversation it
// was asked in.
export function getChatPending() {
  return req('/api/chat/pending');
}
