import { useEffect, useState } from 'react';
import { getTailorFit, getTailorReview, tailorPreview } from '../api.js';
import { saveTailorChoices } from './tailorChoices.js';
import { NO_CHOICES, choicesOf } from './tailorReview.js';
import { pdfLength } from './pdfLength.js';
import { useBlobUrl } from './useBlobUrl.js';
import { notifyError } from './toast.js';

// Several quick clicks are one redraw of the page, not one each.
const SETTLE_MS = 250;

// One job's tailoring on the review screen: the plan as the server lays it
// out, the person's choices, and the page those make. A choice shows at
// once and is saved behind it (in the order made, see tailorChoices.js);
// the page is asked for again once the save has landed, since the server
// draws it from what is saved.
//
//   review   the server's layout, null while it loads
//   error    the Error it could not be opened with
//   choices, change(next)
//   pdf      { url, blob, length, busy, failure, retry }, the shape
//            DocumentPreview already draws
export function useTailorReview(postingId) {
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const [choices, setChoices] = useState(NO_CHOICES);
  const [stamp, setStamp] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const page = useBlobUrl();

  useEffect(() => {
    let alive = true;
    getTailorReview(postingId)
      .then((loaded) => alive && (setReview(loaded), setChoices(choicesOf(loaded))))
      .catch((err) => alive && setError(err));
    return () => { alive = false; };
  }, [postingId]);

  useEffect(() => {
    if (!review) return undefined;
    let alive = true;
    setBusy(true);
    const timer = setTimeout(() => {
      tailorPreview(postingId)
        .then((blob) => alive && (page.show(blob), setFailure(null)))
        .catch((err) => alive && (page.show(null), setFailure(err)))
        .finally(() => alive && setBusy(false));
    }, stamp ? SETTLE_MS : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [postingId, Boolean(review), stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  function change(next) {
    setChoices(next);
    saveTailorChoices(postingId, next)
      .then(() => setStamp((n) => n + 1))
      .catch((err) => notifyError(err, 'Could not save that change'));
  }

  const pdf = { url: page.url, blob: page.blob, length: pdfLength(page.blob), busy, failure, retry: () => setStamp((n) => n + 1) };
  return { review, error, choices, change, pdf };
}

// What could go to fit the page on one, asked for once: when the page first
// runs over, or when the person already made a cut and may want it back.
// Measuring compiles the page several times over, so it is not asked for a
// resume that fits and was never cut. { cuts, enough } or null.
export function useTailorFit(postingId, length, choices) {
  const [fit, setFit] = useState(null);
  const [asked, setAsked] = useState(false);
  const cutAlready = choices.compact || choices.flipped.length > 0 || Object.values(choices.cut).some((list) => list.length);
  const wanted = Boolean(length) && (length.pages > 1 || cutAlready);

  useEffect(() => {
    if (!wanted || asked) return;
    setAsked(true);
    getTailorFit(postingId).then(setFit).catch(() => setFit({ cuts: [], enough: null, failed: true }));
  }, [postingId, wanted, asked]);

  return { fit, measuring: asked && !fit };
}
