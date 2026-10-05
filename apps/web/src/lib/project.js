// Where JobDekho lives and which version this is, for the About card in
// Settings (and the terminal's line at start, apps/server's cli/main.js, which
// names the same address). The version is filled in by the build (see
// vite.config.js); a test run, or a dev config without it, has none.
export const REPO_URL = 'https://github.com/Girish-Garg/jobdekho';

// eslint-disable-next-line no-undef
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null;
