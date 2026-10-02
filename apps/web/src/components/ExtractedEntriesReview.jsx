import { useState } from 'react';
import { ENTRY_SECTIONS } from '../lib/profileSections.js';
import { PROPOSAL_KEYS } from '../lib/mergeProposals.js';

// Skill groups are the one proposal that is not an entry; they land in the
// section the page calls Skills.
const labelFor = (key) => ENTRY_SECTIONS.find((section) => section.key === key)?.label ?? 'Skills';

// A certificate comes from its issuer; everything else happens at a place.
// A skill group has neither, so its name and items say what it is.
function summary(key, entry) {
  if (key === 'skillGroups') return `${entry.name || 'Skills'}: ${(entry.items ?? []).join(', ')}`;
  const at = key === 'certifications' ? 'from' : 'at';
  return `${entry.title || 'Untitled'}${entry.organisation ? ` ${at} ${entry.organisation}` : ''}`;
}

// Extraction proposes; nothing here is saved until "Add selected" merges the
// chosen entries into local state (see mergeProposals.js), and even then
// only Save profile persists them. Declining a row or dismissing the whole
// panel touches nothing already on the profile. Boxed and raised, unlike
// the record around it, because it is the one thing on the page that is
// waiting on a decision and goes away once it has one.
export default function ExtractedEntriesReview({ proposed, onAdd, onDismiss }) {
  const flat = PROPOSAL_KEYS.flatMap((key) => (proposed[key] ?? []).map((entry, i) => ({ key, entry, id: `${key}-${i}` })));
  const [picked, setPicked] = useState(() => new Set(flat.map((row) => row.id)));
  if (flat.length === 0) return null;

  function toggle(id) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSelected() {
    const chosen = Object.fromEntries(PROPOSAL_KEYS.map((key) => [key, []]));
    for (const row of flat) if (picked.has(row.id)) chosen[row.key].push(row.entry);
    onAdd(chosen);
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-edge bg-panel p-4 shadow-raise">
      <h3 className="font-display text-lg font-bold tracking-tight text-ink">From the resume</h3>
      <p className="text-sm text-muted">
        Found {flat.length} {flat.length === 1 ? 'entry' : 'entries'} in the resume. Keep the ones that belong on the record;
        nothing already on it is touched, and none of this is saved until you add it.
      </p>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {flat.map((row) => {
          const keep = picked.has(row.id);
          return (
            <li key={row.id}>
              <label className="flex cursor-pointer items-baseline gap-3 py-2 text-sm text-ink">
                <input type="checkbox" checked={keep} onChange={() => toggle(row.id)} className="relative top-px accent-ink" />
                <span className="w-24 shrink-0 text-xs text-muted">{labelFor(row.key)}</span>
                <span className="min-w-0 flex-1 truncate">{summary(row.key, row.entry)}</span>
                <span className="shrink-0 text-xs text-muted">{keep ? 'keep' : 'discard'}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={addSelected}
          disabled={picked.size === 0}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-opacity duration-fast ease-ease hover:opacity-90 disabled:opacity-60"
        >
          Add selected
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-muted transition-colors duration-fast ease-ease hover:text-ink"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
