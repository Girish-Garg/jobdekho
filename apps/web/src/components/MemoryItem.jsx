import { useState } from 'react';
import MemoryForm from './MemoryForm.jsx';
import IconButton from './ui/IconButton.jsx';
import { PenIcon, TrashIcon } from './Icon.jsx';

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
      <IconButton size="md" outline label={`Edit: ${item.text}`} title="Edit" onClick={() => setEditing(true)}>
        <PenIcon size={13} />
      </IconButton>
      <IconButton
        size="md"
        outline
        tone="danger"
        label={`Delete: ${item.text}`}
        title="Delete"
        disabled={memory.busy}
        onClick={() => memory.remove(item.id)}
        className="disabled:opacity-60"
      >
        <TrashIcon size={13} />
      </IconButton>
    </li>
  );
}
