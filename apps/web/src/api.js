// The server's endpoints, named. Every component imports from here; the
// modules behind it are split by the part of the app they belong to, because
// one file naming every endpoint had outgrown the limit.
export * from './api/postings.js';
export * from './api/profile.js';
export * from './api/ai.js';
export * from './api/documents.js';
export * from './api/chat.js';
