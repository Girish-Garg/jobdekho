import { APP_VERSION } from './project.js';

// What "Copy details" puts on the clipboard when part of the page could not
// be drawn (see components/ErrorBoundary.jsx): the part, the version, the
// error, and the first lines of where in the code and among the components
// it was thrown, enough to find the cause without pages of minified frames.
// It goes nowhere on its own: the person pastes it where they choose.
const FRAMES = 8;

const lines = (text) => String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

// A thrown value need not be an Error: anything can be thrown.
const sentence = (error) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

export function errorReport({ where, error, components = '' }) {
  const said = sentence(error);
  const frames = lines(error?.stack).filter((line) => line !== said).slice(0, FRAMES);
  return [
    `JobDekho ${APP_VERSION ?? '(dev)'} could not show ${where}.`,
    said,
    ...frames,
    ...(components ? ['Components:', ...lines(components).slice(0, FRAMES)] : []),
    `Browser: ${globalThis.navigator?.userAgent ?? 'unknown'}`,
  ].join('\n');
}

// The error's own first line, shown under a page's fallback.
export const errorLine = (error) => lines(sentence(error))[0] ?? 'Unknown error';
