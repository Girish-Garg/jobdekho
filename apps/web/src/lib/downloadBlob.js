// Binary sibling of downloadText.js: same blob-and-click technique, but for
// bytes already sitting in memory (a compiled PDF) rather than text fetched
// fresh, so the download is exactly what the caller is already showing.
const RELEASE_MS = 1000;

export function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), RELEASE_MS);
}
