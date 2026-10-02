// Shown instead of the record when the saved profile could not be read, so
// there is nothing blank on screen to save over the real one (see
// useProfileLoad.js). The likeliest cause is the server having stopped.
export default function ProfileLoadFailed({ onRetry }) {
  return (
    <div role="alert" className="mt-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-5 py-4">
      <p className="text-sm text-muted">
        Your saved profile could not be read, so there is nothing to edit yet. Is JobDekho still running?
      </p>
      <button type="button" onClick={onRetry} className="btn btn-quiet btn-sm px-3 py-1.5">
        Try again
      </button>
    </div>
  );
}
