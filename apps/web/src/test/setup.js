import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { resetChatSession } from '../lib/chatSession.js';
import { resetSourceDrafts } from '../lib/sourceDrafts.js';

// The chat's session outlives any one component on purpose (see
// lib/chatSession.js), so each test starts from an empty one rather than
// inheriting the conversation the last test left behind. The Resume page's
// unsaved drafts outlive the editor the same way (see lib/sourceDrafts.js).
beforeEach(() => {
  resetChatSession();
  resetSourceDrafts();
});
