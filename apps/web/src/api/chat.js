import { req } from './request.js';
import { streamedChatPost } from '../lib/chatStream.js';

// The chats (see the server's api/chats.js). An id is a real chat's, or for
// a job's or a document's chat not made yet "job:<postingId>" or
// "document:<documentId>", which every route resolves to the real chat once
// there is one. The colon is encoded like any other character.
const chatPath = (id, rest = '') => `/api/chats/${encodeURIComponent(id)}${rest}`;

// A JSON POST with no body at all is refused, so an empty one goes instead.
const post = (url, body = {}) => req(url, { method: 'POST', body: JSON.stringify(body) });

// The switcher's list: [view], newest first. A chat with nothing in it is
// never listed.
export function listChats() {
  return req('/api/chats').then((d) => d.chats);
}

// One chat as it opens: { chat, turns, dropped, results }.
export function getChatPage(id) {
  return req(chatPath(id, '/messages'));
}

// What a page that did not watch it happen needs: { busy, waiting, failed }.
export function getChatsPending() {
  return req('/api/chats/pending');
}

// { kind: 'general' | 'compare', jobs?, documents? }, resolving the view of
// the chat made, or of the identical empty one already there.
export function createChat(body) {
  return post('/api/chats', body).then((d) => d.chat);
}

// { action: 'add' | 'remove', type: 'job' | 'document', id }, resolving the
// chat's view, or a new comparison's when a job was added to a job's chat.
export function changeChatItems(id, change) {
  return post(chatPath(id, '/items'), change).then((d) => d.chat);
}

export function markChatSeen(id) {
  return post(chatPath(id, '/seen')).then((d) => d.chat);
}

export function clearChat(id) {
  return post(chatPath(id, '/clear')).then((d) => d.chat);
}

export function deleteChat(id) {
  return req(chatPath(id), { method: 'DELETE' });
}

// { stopped }, false unless the running call is in this chat.
export function stopChat(id) {
  return post(chatPath(id, '/stop'));
}

// The chat's one follow-up, sent by the server once its running answer is
// in: { waiting }, or { started, chatId } when nothing was running after all.
// A blank message takes it back.
export function queueChatMessage(id, body) {
  return post(chatPath(id, '/queue'), body);
}

// { message, page, filters, sort }, resolving the saved turn with `chatId`,
// the chat it was saved in.
export function sendChatMessage(id, body, { onEvent } = {}) {
  return streamedChatPost(chatPath(id, '/messages'), body, onEvent);
}

// A comparison's own two actions, each resolving the turn its card is.
export function tailorForAll(id, { onEvent } = {}) {
  return streamedChatPost(chatPath(id, '/tailor-all'), {}, onEvent);
}

export function lettersForEach(id, { onEvent } = {}) {
  return streamedChatPost(chatPath(id, '/letters-each'), {}, onEvent);
}

// Everything the AI made, newest first (see the server's chat/made-by-ai.js).
export function getMadeByAi() {
  return req('/api/chat/made-by-ai').then((d) => d.items);
}

// The two buttons on a proposal card. The server applies the proposal it
// saved with the turn, found by id in whichever chat offered it, never
// anything sent here. Resolves { proposal, profile } or { proposal, document }.
export function applyProposal(id) {
  return post(`/api/chat/proposals/${encodeURIComponent(id)}/apply`);
}

export function discardProposal(id) {
  return post(`/api/chat/proposals/${encodeURIComponent(id)}/discard`);
}
