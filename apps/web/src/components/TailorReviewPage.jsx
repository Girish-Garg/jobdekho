import { lazy, Suspense } from 'react';

// Fetched the first time a review is opened, as the Resume page itself is
// (see ShellMain.jsx): most visits there never open one, and the review
// brings a screen's worth of code with it.
const TailorReview = lazy(() => import('./TailorReview.jsx'));

export default function TailorReviewPage(props) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Opening the review...</p>}>
      <TailorReview {...props} />
    </Suspense>
  );
}
