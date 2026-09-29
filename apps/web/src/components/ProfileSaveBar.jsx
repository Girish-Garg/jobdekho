import SaveBar from './SaveBar.jsx';

// The one save for the whole record, pinned to the bottom of the page while
// anything is unsaved. It used to sit at the very end of the record, a long
// scroll from the basics and the first sections, so an edit up top was easy
// to leave unsaved without ever seeing the button. A new record (nothing on
// the server yet) always shows it, since everything in it is unsaved.
export default function ProfileSaveBar({ dirty, fresh, onSave, onDiscard }) {
  if (!dirty && !fresh) return null;

  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-panel/95 px-5 py-3 shadow-pop backdrop-blur">
      <p className="flex items-center gap-2 text-sm text-ink">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
        {fresh ? 'Your profile is not saved yet.' : 'You have unsaved changes.'}
      </p>
      <div className="flex items-center gap-2">
        {!fresh && (
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors duration-fast ease hover:text-ink"
          >
            Discard
          </button>
        )}
        <SaveBar onSave={onSave} label="Save profile" />
      </div>
    </div>
  );
}
