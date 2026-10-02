import SaveBar from './SaveBar.jsx';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';

// The one save for the whole record, pinned to the bottom of the page while
// anything is unsaved. It used to sit at the very end of the record, a long
// scroll from the basics and the first sections, so an edit up top was easy
// to leave unsaved without ever seeing the button. A record never saved
// follows the same rule: its `dirty` is measured against the empty profile
// (see useProfileState.js), so a first visit that has typed nothing is not
// nagged, and the bar arrives with the first thing entered. `fresh` only
// changes what it says and takes Discard away, since a record never saved has
// no earlier copy worth going back to.
export default function ProfileSaveBar({ dirty, fresh, onSave, onDiscard }) {
  if (!dirty) return null;

  return (
    <Card variant="pop" className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-panel/95 px-5 py-3 backdrop-blur">
      <p className="flex items-center gap-2 text-sm text-ink">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
        {fresh ? 'Your profile is not saved yet.' : 'You have unsaved changes.'}
      </p>
      <div className="flex items-center gap-2">
        {!fresh && (
          <Button variant="ghost" onClick={onDiscard} className="py-2 font-normal">
            Discard
          </Button>
        )}
        <SaveBar onSave={onSave} label="Save profile" />
      </div>
    </Card>
  );
}
