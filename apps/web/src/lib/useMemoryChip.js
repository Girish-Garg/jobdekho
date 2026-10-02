import { useState } from 'react';
import { saveMemory, editMemory, deleteMemory } from '../api.js';
import { announceMemoryChanged } from './memorySignal.js';

// A 404 from a delete or a restore means the item is gone already, and a 409
// from a restore that the old one cannot come back (its words saved again
// since, or 150 kept): neither stops an Undo from finishing.
const unless = (...statuses) => (err) => {
  if (!statuses.includes(err.status)) throw err;
};

// One chip under a chat answer (see MemoryChip.jsx). It starts as the turn
// was saved, so a reloaded conversation shows each chip as it was then, and
// a Save of words already kept answers with that item (see the server's
// api/memory.js), so an old chip pressed again never keeps a second copy.
//
//   status   'suggested', 'saved' or 'dismissed' (Not now, never sent anywhere)
//   draft    the words being edited, or null
export function useMemoryChip(memory) {
  const [chip, setChip] = useState(() => ({
    status: memory.status === 'saved' ? 'saved' : 'suggested',
    id: memory.id ?? null,
    text: memory.text,
    scope: memory.scope,
    quote: memory.quote ?? null,
    replaces: memory.replaces ?? null,
    replacedText: memory.replacedText ?? null,
  }));
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const patch = (change) => setChip((current) => ({ ...current, ...change }));

  async function run(which, work) {
    if (busy) return;
    setBusy(which);
    setError(null);
    try {
      await work();
      announceMemoryChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  // A suggestion is saved as it reads, or as edited; a saved chip's edit
  // changes the item it saved.
  const save = () => run('save', async () => {
    const text = draft ?? chip.text;
    if (chip.status === 'saved') {
      const { item } = await editMemory(chip.id, { text });
      patch({ text: item.text });
    } else {
      const { item, replaced } = await saveMemory({ text, scope: chip.scope, quote: chip.quote, replaces: chip.replaces });
      patch({ status: 'saved', id: item.id, text: item.text, replaces: replaced?.id ?? null, replacedText: replaced?.text ?? null });
    }
    setDraft(null);
  });

  // Back to before the save: the new item gone, the one it replaced in force
  // again, and the chip offering the suggestion once more.
  const undo = () => run('undo', async () => {
    await deleteMemory(chip.id).catch(unless(404));
    if (chip.replaces) await editMemory(chip.replaces, { restore: true }).catch(unless(404, 409));
    patch({ status: 'suggested', id: null });
  });

  return {
    ...chip,
    draft,
    busy,
    error,
    save,
    undo,
    setDraft,
    edit: () => setDraft(chip.text),
    cancel: () => setDraft(null),
    dismiss: () => patch({ status: 'dismissed' }),
  };
}
