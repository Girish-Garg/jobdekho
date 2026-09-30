// Stands in for the fill-in button once the profile already holds something,
// because there is no telling a hand-corrected field from an extracted one.
// "Keep my edits" is the way out, so the safe choice is also the named one.
export default function OverwriteConfirm({ label, onConfirm, onCancel }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <p className="text-sm text-ink">
        This replaces the skills, titles, locations, years and degree below with what {label} reads
        in your resume. Anything you corrected by hand in those fields is overwritten.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition hover:opacity-90"
        >
          Overwrite and fill in
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-quiet font-normal"
        >
          Keep my edits
        </button>
      </div>
    </div>
  );
}
