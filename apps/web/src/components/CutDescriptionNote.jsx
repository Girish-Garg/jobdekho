// Adzuna's API sends only the start of each description, about 500
// characters ending in "…", and its pages are not JobDekho's to read (its
// terms keep the API for listings), so the pane says where the rest is
// rather than leaving the text to stop mid-sentence.
const CUT = /…\s*$/;

const fromAdzuna = (posting) => String(posting?.source || '').split(':')[0] === 'adzuna';

export default function CutDescriptionNote({ posting, text }) {
  if (!fromAdzuna(posting) || !CUT.test(String(text || '')) || !posting.url) return null;
  return (
    <p className="mt-3 text-sm text-muted">
      Adzuna shares only the start of each description.{' '}
      <a href={posting.url} target="_blank" rel="noreferrer" className="link">Read the rest on the posting&apos;s page</a>.
    </p>
  );
}
