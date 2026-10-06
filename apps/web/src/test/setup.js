import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { resetChatStore } from '../lib/chatStore.js';
import { resetActiveChat } from '../lib/activeChat.js';
import { resetChatDrafts } from '../lib/chatDrafts.js';
import { resetOpenedLately } from '../lib/openedLately.js';
import { resetSourceDrafts } from '../lib/sourceDrafts.js';

// The chats' state outlives any one component on purpose (see
// lib/chatStore.js and lib/activeChat.js), and drafts are kept in the
// browser (lib/chatDrafts.js), so each test starts from none of them rather
// than inheriting what the last test left behind. The Resume page's unsaved
// drafts outlive the editor the same way (see lib/sourceDrafts.js).
beforeEach(() => {
  resetChatStore();
  resetActiveChat();
  resetChatDrafts();
  resetOpenedLately();
  resetSourceDrafts();
});
