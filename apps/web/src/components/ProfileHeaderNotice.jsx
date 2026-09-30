import { useProfileHeader } from '../lib/useProfileHeader.js';
import ProfileHeaderReview from './ProfileHeaderReview.jsx';
import { UserIcon } from './Icon.jsx';

const KEEP = 'rounded-full px-3 py-1.5 text-sm text-muted transition-colors duration-fast ease hover:text-ink disabled:opacity-50';
// "name", "name and headline", "name, headline and contact line".
function spoken(fields) {
  const words = fields.map((field) => field.toLowerCase());
  return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

const UPDATE = 'rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-on-accent transition duration-fast ease hover:brightness-110 disabled:opacity-60';

// The document's header says something other than the profile: usually the
// person changed their name or contact details after it was made, but a
// header the chat wrote can differ too, so the notice says only that.
// A document is their own source, so it is never rewritten on its own: this
// offers the change, shows it as a diff before anything is saved, and lets
// them keep what they have (the server then stays quiet until the profile
// changes again). Teal like ChangedNotice.jsx, since nothing is wrong, only
// newer, and the same opaque panel under the tint.
export default function ProfileHeaderNotice({ doc, onApplied, onKept }) {
  const header = useProfileHeader(doc, { onApplied, onKept });
  const fields = spoken(doc.profileHeader.fields);

  return (
    <div className="shrink-0 bg-paper px-4 pt-4">
      <section aria-label="Header from your profile" className="rounded-2xl border border-accent/30 bg-panel">
        <div className="rounded-2xl bg-accent/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
              <UserIcon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Your profile has a different {fields} from this document.</p>
              <p className="text-xs text-muted">Updating changes only the header, as a new version you can restore.</p>
            </div>
            {!header.review && (
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={header.keep} disabled={Boolean(header.busy)} className={KEEP}>
                  {header.busy === 'keep' ? 'Keeping...' : 'Keep this one'}
                </button>
                <button type="button" onClick={header.start} disabled={Boolean(header.busy)} className={UPDATE}>
                  {header.busy === 'preview' ? 'Preparing...' : 'Update from profile'}
                </button>
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
      </section>
    </div>
  );
}
