import { useEffect, useState } from 'react';
import { getConversation, continueConversation, deleteConversation } from '../api.js';
import { notifyError } from './toast.js';

// One filed conversation, opened read-only from History, and the two things
// that can be done with it: continue it (it becomes the current one, and
// the current one is filed in its place, see the server's chat-switch.js)
// or delete it. `conversation` is undefined while it loads and null when it
// is gone. `onContinued` gets the new current conversation, `onDeleted` the
// id that went.
export function useConversationReader(id, { onContinued, onDeleted }) {
  const [conversation, setConversation] = useState(undefined);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let alive = true;
    setConversation(undefined);
    getConversation(id)
      .then((found) => alive && setConversation(found))
      .catch(() => alive && setConversation(null));
    return () => {
      alive = false;
    };
  }, [id]);

  async function run(which, title, call) {
    if (busy) return;
    setBusy(which);
    try {
      await call();
    } catch (err) {
      notifyError(err, title);
    } finally {
      setBusy(null);
    }
  }

  const carryOn = () => run('continue', 'Could not continue the conversation', async () => onContinued(await continueConversation(id)));
  const remove = () => run('delete', 'Could not delete the conversation', async () => {
    await deleteConversation(id);
    onDeleted(id);
  });

  return { conversation, busy, carryOn, remove };
}
