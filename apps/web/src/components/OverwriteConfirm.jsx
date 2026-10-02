// Stands in for the fill-in button once the profile already holds something,
// because there is no telling a hand-corrected field from an extracted one.
// "Keep my edits" is the way out, so the safe choice is also the named one.
// It lives in the resume card, as narrow as the rail it sits in, so the two
// choices stack at the card's width rather than squeezing onto one line; the
// go-ahead keeps the tint of the button that asked.
export default function OverwriteConfirm({ onConfirm, onCancel }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <p className="text-sm text-ink">
        This replaces your skills, titles, locations, years and degree. Everything else is offered for review.
      </p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onConfirm} className="btn btn-tint w-full px-4 py-2 text-sm">
          Overwrite and fill in
        </button>
        <button type="button" onClick={onCancel} className="btn btn-quiet w-full px-4 py-2 text-sm font-normal">
          Keep my edits
        </button>
      </div>
    </div>
  );
}
