import { useState } from 'react';
import { ENTRY_SECTIONS } from '../lib/profileSections.js';

const PROPOSED_KEYS = ['experience', 'projects', 'education'];
const labelFor = (key) => ENTRY_SECTIONS.find((section) => section.key === key).label;

// Extraction proposes; nothing here is saved until "Add selected" merges the
// chosen entries into local state (see mergeProposals.js), and even then
// only Save profile persists them. Declining a row or dismissing the whole
// panel touches nothing already on the profile.
export default function ExtractedEntriesReview({ proposed, onAdd, onDismiss }) {
  const flat = PROPOSED_KEYS.flatMap((key) => (proposed[key] ?? []).map((entry, i) => ({ key, entry, id: `${key}-${i}` })));
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
    const chosen = { experience: [], projects: [], education: [] };
    for (const row of flat) if (picked.has(row.id)) chosen[row.key].push(row.entry);
    onAdd(chosen);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <p className="text-sm text-ink">
        Found {flat.length} {flat.length === 1 ? 'entry' : 'entries'} in the resume. Pick the ones to add;
        nothing already on your profile is touched, and none of this is saved until you add it.
      </p>
      <ul className="flex flex-col gap-1.5">
        {flat.map((row) => (
          <li key={row.id}>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" checked={picked.has(row.id)} onChange={() => toggle(row.id)} className="mt-1" />
              <span>
                <span className="text-xs text-muted">{labelFor(row.key)}:</span>{' '}
                {row.entry.title || 'Untitled'}
                {row.entry.organisation ? ` at ${row.entry.organisation}` : ''}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addSelected}
          disabled={picked.size === 0}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-60"
        >
          Add selected
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-muted transition hover:border-ink hover:text-ink"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
