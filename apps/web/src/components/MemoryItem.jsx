import { useState } from 'react';
import MemoryForm from './MemoryForm.jsx';
import { PenIcon, TrashIcon } from './Icon.jsx';

// The same round buttons the skill groups use for their bin (see
// SkillGroupsSection.jsx), level with the line they act on.
const ROUND = 'grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-panel text-muted transition-colors duration-fast ease disabled:opacity-60';

// One line the AI knows, with where it came from: the person's own words in
// the chat, or a line they wrote here. Edit opens it in place; Delete acts
// at once, since one line is quickly written again.
export default function MemoryItem({ item, memory }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    const save = async (text, scope) => {
      if (await memory.edit(item.id, { text, scope })) setEditing(false);
    };
    return (
      <li className="py-2.5">
        <MemoryForm label={`Change: ${item.text}`} initial={item} busy={memory.busy} onSave={save} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{item.text}</p>
        <p className="mt-0.5 text-xs text-muted">{item.quote ? `From the chat: '${item.quote}'` : 'Written by you'}</p>
      </div>
      <button type="button" aria-label={`Edit: ${item.text}`} title="Edit" onClick={() => setEditing(true)} className={`${ROUND} hover:border-edge hover:text-ink`}>
        <PenIcon size={13} />
      </button>
      <button type="button" aria-label={`Delete: ${item.text}`} title="Delete" disabled={memory.busy} onClick={() => memory.remove(item.id)} className={`${ROUND} hover:border-ember/40 hover:text-ember`}>
        <TrashIcon size={13} />
      </button>
    </li>
  );
}
