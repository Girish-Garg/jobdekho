// Hands the browser a text file to save. A Blob behind an object URL is the
// one way a page offers a download without a server round trip, which is
// right for a local app whose server never sees the edited text. The link
// exists only for its click; the URL is released a moment later rather than
// at once, because the browser starts the download from the click and some
// need the URL still alive when they do.
const RELEASE_MS = 1000;

export function downloadText(fileName, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), RELEASE_MS);
}
