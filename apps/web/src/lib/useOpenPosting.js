import { useEffect, useRef, useState } from 'react';
import { findRowElement } from './scrollSelectedIntoView.js';
import { announceOpenPosting, onOpenPostingRequest } from './openPostingSignal.js';
import { notify } from './toast.js';

// Which posting fills the detail slot, kept apart from row selection so j/k
// can move the highlight without popping a dialog or repainting the pane on
// every keystroke - only a click or Enter commits to opening one.
export function useOpenPosting(rows) {
  const [openId, setOpenId] = useState(null);
  // Focus has to land back on the exact row that opened the detail, and the
  // row is not remounted, so the element itself is the cheapest handle.
  const openerRef = useRef(null);
  const opened = rows.find((row) => row.id === openId) || null;

  // The chat panel has no other route to "what is open beside the list" (see
  // openPostingSignal.js) short of Shell growing a bridge between two
  // features that otherwise never touch. Keyed on the id, not the row: a
  // status change hands back a new row object for the same posting, and
  // re-announcing it would pull a chat the person had just unscoped back
  // onto it. The unmount case resets the signal so a later mount of this
  // same view does not start chat off believing a posting is still open.
  useEffect(() => { announceOpenPosting(opened); }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => announceOpenPosting(null), []);

  function openById(id) {
    if (!rows.some((row) => row.id === id)) return false;
    openerRef.current = findRowElement(id);
    setOpenId(id);
    return true;
  }

  // A job the chat named can have dropped out of the loaded rows since (the
  // filters changed after the answer), and a click that silently does
  // nothing reads as broken, so that case is said out loud.
  useEffect(() => onOpenPostingRequest((id) => {
    if (openById(id)) return;
    notify({ title: 'Not in the feed right now', detail: 'That job is not among the postings on screen under the current filters.' });
  }), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  function openFromClick(posting, element) {
    openerRef.current = element;
    setOpenId(posting.id);
  }

  function close() {
    setOpenId(null);
    openerRef.current?.focus();
  }

  return { opened, openFromClick, openById, close };
}
