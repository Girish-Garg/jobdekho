import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { resetChatSession } from '../lib/chatSession.js';

// The chat's session outlives any one component on purpose (see
// lib/chatSession.js), so each test starts from an empty one rather than
// inheriting the conversation the last test left behind.
beforeEach(() => resetChatSession());
