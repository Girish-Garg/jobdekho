import { useEffect, useRef, useState } from 'react';
import { getResumePdf, getResumeTex } from '../api.js';
import { downloadText } from '../lib/downloadText.js';

const BUTTON = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60';
// A person stops typing/clicking for this long before a compile is worth
// paying for; every checkbox or reorder click would otherwise fire its own
// pdflatex run.
const DEBOUNCE_MS = 400;

// Binary sibling of lib/downloadText.js: same blob-and-click technique, but
// for the PDF bytes already sitting in state rather than text fetched fresh,
// so the download is exactly the page the iframe is showing.
function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Compiles on every selection change (debounced) and shows the result in an
// iframe. A compile failure - most commonly no LaTeX installed at all -
// leaves the iframe empty and shows the server's own sentence verbatim
// (see apps/server/src/resume/errors.js); Download .tex never depends on
// that compile succeeding, so the page stays useful either way. `plan` is
// only set when the builder was seeded from a tailored resume (see
// ResumeBuilderOverlay.jsx): it rides along on every render so the server
// can swap in that plan's reworded bullets for whichever entries `selection`
// still has checked, however the person has since ticked or reordered them.
export default function ResumeBuilderPreview({ selection, plan, fileName }) {
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const urlRef = useRef(null);
  const payload = plan ? { ...selection, plan } : selection;

  useEffect(() => {
    let alive = true;
    setBusy(true);
    const timer = setTimeout(() => {
      getResumePdf(payload)
        .then((blob) => {
          if (!alive) return;
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setPdfUrl(url);
          setPdfBlob(blob);
          setError(null);
        })
        .catch((err) => {
          if (!alive) return;
          setPdfUrl(null);
          setPdfBlob(null);
          setError(err);
        })
        .finally(() => alive && setBusy(false));
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [selection, plan]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  async function onDownloadTex() {
    const tex = await getResumeTex(payload);
    downloadText(`${fileName}.tex`, tex);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!pdfBlob} onClick={() => downloadBlob(`${fileName}.pdf`, pdfBlob)} className={BUTTON}>
          Download PDF
        </button>
        <button type="button" onClick={onDownloadTex} className={BUTTON}>Download .tex</button>
        <span aria-live="polite" className="text-sm text-muted">{busy ? 'Compiling...' : ''}</span>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-line bg-panel p-3 text-sm leading-relaxed text-ink">
          {error.message}
        </p>
      )}
      {pdfUrl && (
        <iframe title="Resume preview" src={pdfUrl} className="min-h-0 flex-1 rounded-md border border-line bg-panel" />
      )}
    </div>
  );
}
