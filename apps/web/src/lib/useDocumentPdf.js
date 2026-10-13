import { useEffect, useState } from 'react';
import { compileDocument } from '../api.js';
import { pdfLength } from './pdfLength.js';
import { useBlobUrl } from './useBlobUrl.js';

// The open document compiled, again whenever its source changes: a save, a
// restore, an applied proposal. The server guards and caches every compile
// (see its documents/pdf.js), so asking again for a source it has seen is
// cheap. `failure` is the Error it refused with, carrying `kind` ('unsafe'
// for the guard, else why LaTeX could not build it) and, for the guard,
// `problems`. `length` is how long the PDF on screen runs, { pages,
// lastLines }, or null when the server could not say.
//
// A failed compile clears the old PDF rather than leaving it up: a preview
// that no longer matches the source beside it would read as the new one.
// `retry` asks again for the same source, for a failure the source did not
// cause: LaTeX installed since, or a compile that ran out of time.
export function useDocumentPdf(doc) {
  const pdf = useBlobUrl();
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const id = doc?.id ?? null;
  const tex = doc?.tex ?? null;
  const { show } = pdf;

  // Another document's PDF must never sit under this one's name.
  useEffect(() => {
    show(null);
    setFailure(null);
  }, [id, show]);

  useEffect(() => {
    if (!id || tex === null) return undefined;
    let alive = true;
    setBusy(true);
    compileDocument(id)
      .then((blob) => {
        if (!alive) return;
        show(blob);
        setFailure(null);
      })
      .catch((err) => {
        if (!alive) return;
        show(null);
        setFailure(err);
      })
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [id, tex, attempt, show]);

  return { url: pdf.url, blob: pdf.blob, length: pdfLength(pdf.blob), busy, failure, retry: () => setAttempt((n) => n + 1) };
}
