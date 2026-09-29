// A file name from a document name the person typed, the same way the
// server names its .tex download (see its api/document-files.js): letters,
// digits, dots, dashes and underscores, spaces to dashes, never a leading
// dot, and "document" when nothing is left.
export function fileSlug(name) {
  const safe = String(name ?? '').replace(/[^A-Za-z0-9 ._-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 80);
  return safe.replace(/^\.+/, '') || 'document';
}
