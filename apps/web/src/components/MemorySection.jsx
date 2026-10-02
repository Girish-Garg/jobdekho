import { useState } from 'react';
import { sectionId } from '../lib/profileIndex.js';
import { useMemory } from '../lib/useMemory.js';
import { MEMORY_SCOPES } from '../lib/memoryScopes.js';
import ProfileSection, { AddControl } from './ProfileSection.jsx';
import SettingSwitch from './SettingSwitch.jsx';
import MemoryForm from './MemoryForm.jsx';
import MemoryItem from './MemoryItem.jsx';
import MemoryForget from './MemoryForget.jsx';
import { NoteIcon } from './IconMemory.jsx';

const EMPTY = 'The chat will suggest things to remember as you talk, and nothing is saved without your click.';
const SWITCH_HINT = 'The chat, resume tailoring and cover letters read what is saved here. Off, nothing is suggested or used.';

// What the chat remembers of the person (see the server's api/memory.js),
// as text they can read, change and delete. It is not part of the record
// above: each change is saved as it is made, not with the record's Save,
// and deleting the profile leaves it alone. Grouped by where each line
// applies, in the order the scopes are listed.
export default function MemorySection() {
  const memory = useMemory();
  const [adding, setAdding] = useState(false);
  const ready = memory.state === 'ready';
  const groups = MEMORY_SCOPES.map((scope) => ({ ...scope, items: memory.items.filter((item) => item.scope === scope.key) }))
    .filter((group) => group.items.length > 0);

  async function add(text, scope) {
    if (await memory.add(text, scope)) setAdding(false);
  }

  return (
    <ProfileSection
      id={sectionId('memory')}
      title="What the AI knows about you"
      icon={NoteIcon}
      count={ready ? memory.items.length : null}
      hint={ready && memory.items.length === 0 ? EMPTY : null}
      action={ready && <AddControl label="Add" onClick={() => setAdding(true)} />}
    >
      {memory.state === 'loading' && <p className="text-sm text-muted">Loading what the AI knows...</p>}
      {memory.state === 'failed' && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ember">Could not load what the AI knows.</p>
          <button type="button" onClick={memory.retry} className="btn btn-quiet btn-sm">Try again</button>
        </div>
      )}
      {ready && (
        <>
          <SettingSwitch label="Let the chat suggest and use memories" hint={SWITCH_HINT} on={memory.enabled} disabled={memory.busy} onChange={memory.setEnabled} />
          {memory.error && <p role="alert" className="text-sm text-ember">{memory.error}</p>}
          {adding && <MemoryForm label="Add a memory" busy={memory.busy} onSave={add} onCancel={() => setAdding(false)} />}
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-0.5">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{group.label}</h4>
              <ul aria-label={group.label} className="flex flex-col divide-y divide-line">
                {group.items.map((item) => <MemoryItem key={item.id} item={item} memory={memory} />)}
              </ul>
            </div>
          ))}
          {(memory.items.length > 0 || memory.archived > 0) && <MemoryForget busy={memory.busy} onForget={memory.forget} />}
        </>
      )}
    </ProfileSection>
  );
}
