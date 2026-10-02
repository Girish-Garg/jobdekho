import { useProfileHeader } from '../lib/useProfileHeader.js';
import ProfileHeaderReview from './ProfileHeaderReview.jsx';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import { UserIcon } from './Icon.jsx';

// "name", "name and headline", "name, headline and contact line".
function spoken(fields) {
  const words = fields.map((field) => field.toLowerCase());
  return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

// The document's header says something other than the profile: usually the
// person changed their name or contact details after it was made, but a
// header the chat wrote can differ too, so the notice says only that.
// A document is their own source, so it is never rewritten on its own: this
// offers the change, shows it as a diff before anything is saved, and lets
// them keep what they have (the server then stays quiet until the profile
// changes again). Neutral like ChangedNotice.jsx, since nothing is wrong,
// only newer, on the same opaque panel.
export default function ProfileHeaderNotice({ doc, onApplied, onKept }) {
  const header = useProfileHeader(doc, { onApplied, onKept });
  const fields = spoken(doc.profileHeader.fields);

  return (
    <div className="shrink-0 bg-paper px-4 pt-4">
      <Card as="section" aria-label="Header from your profile" className="border-edge p-0 shadow-raise">
        <div className="rounded-2xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <UserIcon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Your profile has a different {fields} from this document.</p>
              <p className="text-xs text-muted">Updating changes only the header, as a new version you can restore.</p>
            </div>
            {!header.review && (
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" onClick={header.keep} disabled={Boolean(header.busy)} className="px-3 font-normal disabled:opacity-50">
                  {header.busy === 'keep' ? 'Keeping...' : 'Keep this one'}
                </Button>
                <Button variant="primary" onClick={header.start} disabled={Boolean(header.busy)}>
                  {header.busy === 'preview' ? 'Preparing...' : 'Update from profile'}
                </Button>
              </div>
            )}
          </div>
          {header.review && (
            <ProfileHeaderReview
              before={doc.tex}
              after={header.review.tex}
              busy={header.busy === 'apply'}
              onApply={header.apply}
              onCancel={header.cancel}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
