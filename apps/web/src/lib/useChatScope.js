import { useEffect, useState } from 'react';
import { currentOpenPosting, onOpenPostingChange } from './openPostingSignal.js';
import { onBlocked } from './blockedSignal.js';

// Which job the conversation is about. It follows the job pane: a posting
// opened there becomes the scope, including one already open when the panel
// mounts. Closing the pane does not clear it, because the person may well
// have closed the pane to read the answer, and the dialog on a narrow screen
// has to close for the chat to be seen at all. Only the person clears it,
// or blocks its company (see blockedSignal.js): a job they never want to see
// again is not one to keep asking about.
export function useChatScope() {
  const [posting, setPosting] = useState(currentOpenPosting);

  useEffect(() => onOpenPostingChange((opened) => opened && setPosting(opened)), []);
  useEffect(() => onBlocked((names) => setPosting((scoped) => (scoped && names.includes(scoped.company) ? null : scoped))), []);

  return { posting, focus: setPosting, clear: () => setPosting(null) };
}
