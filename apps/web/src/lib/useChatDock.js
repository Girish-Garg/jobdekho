import { useEffect, useState } from 'react';
import { onAskAboutPosting } from './askAiSignal.js';
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

  useEffect(() => onAskAboutPosting((next) => {
    setRequest(next);
    setOpen(true);
  }), []);

  useEffect(() => saveLayout({ open }), [open]);

  function close() {
    setOpen(false);
    setRequest(null);
  }

  return { open, request, close, toggle: () => (open ? close() : setOpen(true)) };
}
