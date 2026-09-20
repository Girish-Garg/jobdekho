import { req } from './request.js';
import { streamedChatPost } from '../lib/chatStream.js';

export function getChatHistory() {
  return req('/api/chat/history');
}

// Resolves with the turn the server saved: { question, answer, actions,
// provider, createdAt } (see packages/store/src/chat-history.js).
export function sendChatMessage(payload, { onEvent } = {}) {
  return streamedChatPost('/api/chat', payload, onEvent);
}

export function clearChatHistory() {
  return req('/api/chat/history', { method: 'DELETE' });
}
