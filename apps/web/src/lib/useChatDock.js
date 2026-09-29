import { useEffect, useState } from 'react';
import { onAskAboutPosting } from './askAiSignal.js';
import { onChatDraft } from './chatDraftSignal.js';
import { opensDocked, saveLayout } from './chatLayout.js';

// Whether the chat panel is open, and the job pane's latest "Ask AI about
// this job" for it to act on. The pane asking is what opens the panel, so the
// person never has to find the chat first. Closing drops the request: it has
// been acted on, and a panel opened later from the topbar should start from
// whatever is open in the pane, not replay an old ask.
//
// Open or closed is remembered for a pinned panel only (see chatLayout.js),
// so a chat docked to the side is still there after a reload.
export function useChatDock() {
  const [open, setOpen] = useState(() => opensDocked());
  const [request, setRequest] = useState(null);
  // "Add with AI" on the Profile page: words to start the box with, which
  // open the panel the same way the pane's ask does (see chatDraftSignal.js).
  const [draft, setDraft] = useState(null);

  useEffect(() => onAskAboutPosting((next) => {
    setRequest(next);
    setOpen(true);
  }), []);

  useEffect(() => onChatDraft((next) => {
    setDraft(next);
    setOpen(true);
  }), []);

  useEffect(() => saveLayout({ open }), [open]);

  function close() {
    setOpen(false);
    setRequest(null);
    setDraft(null);
  }

  return { open, request, draft, close, show: () => setOpen(true), toggle: () => (open ? close() : setOpen(true)) };
}
