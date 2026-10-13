// How long each compiled PDF runs, as the server measured it and sent it in
// the answer's headers (see its api/document-files.js). Kept beside the
// blob rather than on it, so the PDF handed on is still only a PDF, and
// forgotten with it.
const LENGTHS = new WeakMap();

function lengthIn(headers) {
  const pages = Number(headers?.get?.('x-pdf-pages'));
  const lastLines = Number(headers?.get?.('x-pdf-last-lines'));
  if (!Number.isInteger(pages) || pages < 1) return null;
  return { pages, lastLines: Number.isInteger(lastLines) && lastLines > 0 ? lastLines : 0 };
}

export function notePdfLength(blob, headers) {
  const length = lengthIn(headers);
  if (length) LENGTHS.set(blob, length);
  return blob;
}

// { pages, lastLines } for a PDF a compile answered with, or null for one
// the server could not measure.
export const pdfLength = (blob) => (blob ? LENGTHS.get(blob) ?? null : null);

// ", about 6 lines over" for a document two pages long, where the lines on
// the second are how much has to go; nothing for any other length, where no
// count would help.
export function overBy({ pages, lastLines }) {
  if (pages !== 2 || !lastLines) return '';
  return `, about ${lastLines} ${lastLines === 1 ? 'line' : 'lines'} over`;
}
