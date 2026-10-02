import { useState } from 'react';
import { sectionId } from '../lib/profileIndex.js';
import { initials } from './CompanyMark.jsx';
import ContactChips from './ContactChips.jsx';
import ProfileStrength from './ProfileStrength.jsx';
import BasicsForm from './BasicsForm.jsx';
import AskAiControl from './AskAiControl.jsx';
import { PenIcon } from './Icon.jsx';

// Who the record is about, as a card rather than eight open inputs: the name
// and headline large, the ways to reach them as chips, and how complete the
// record is. The basics are edited in place under it, on demand, since they
// change once in a long while; a record with no name yet opens with them.
// "Add with AI" here is the open door: whatever the person tells the chat
// about themselves, it offers back as a change to apply.
export default function ProfileHero({ basics, profile, onChange }) {
  const [editing, setEditing] = useState(!basics.name);

  return (
    <section id={sectionId('basics')} aria-label="Basics" className="scroll-mt-14 min-[1100px]:scroll-mt-4 rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-5">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/15 font-display text-xl font-extrabold text-primary">
          {basics.name ? initials(basics.name) : '?'}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl font-extrabold tracking-tight text-ink">{basics.name || 'Your name'}</h2>
          <p className="mt-0.5 text-sm text-muted">{basics.headline || 'Add a one-line headline, like "Backend engineer, payments"'}</p>
          <ContactChips basics={basics} />
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
          <ProfileStrength profile={profile} />
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
            <AskAiControl prompt="Add to my profile: " where="your profile" />
            <button
              type="button"
              aria-expanded={editing}
              onClick={() => setEditing(!editing)}
              className="btn btn-quiet btn-sm px-3 py-1.5"
            >
              <PenIcon size={12} />
              {editing ? 'Done editing' : 'Edit basics'}
            </button>
          </div>
        </div>
      </div>
      {editing && (
        <div className="mt-5 rounded-xl border border-line bg-paper/60 p-4">
          <BasicsForm basics={basics} onChange={onChange} />
        </div>
      )}
    </section>
  );
}
