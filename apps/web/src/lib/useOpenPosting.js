import { useEffect, useRef, useState } from 'react';
import { getPosting } from '../api/postings.js';
import { findRowElement } from './scrollSelectedIntoView.js';
import { announceOpenPosting, onOpenPostingRequest } from './openPostingSignal.js';
import { notify } from './toast.js';

// Which posting fills the detail slot, kept apart from row selection so j/k
// can move the highlight without popping a dialog or repainting the pane on
// every keystroke - only a click or Enter commits to opening one.
//
// `outside` is a posting opened that the loaded rows do not hold: the chat
// names jobs from the whole corpus (a company's openings, stale ones too),
// and the filters on screen may hide them. `fetchPosting` is injectable so a
// test never reaches the network.
export function useOpenPosting(rows, { fetchPosting = getPosting } = {}) {
  const [openId, setOpenId] = useState(null);
  const [outside, setOutside] = useState(null);
  // Focus has to land back on the exact row that opened the detail, and the
  // row is not remounted, so the element itself is the cheapest handle.
  const openerRef = useRef(null);
  const opened = rows.find((row) => row.id === openId) || (outside?.id === openId ? outside : null);

  // The chat panel has no other route to "what is open beside the list" (see
  // openPostingSignal.js). Keyed on the id, not the row: a status change hands
  // back a new row object for the same posting, and re-announcing it would
  // pull a chat the person had just unscoped back onto it. The unmount case
  // resets the signal so a later mount does not start chat off believing a
  // posting is still open.
  useEffect(() => { announceOpenPosting(opened); }, [openId, outside?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => announceOpenPosting(null), []);

  function openById(id) {
    if (!rows.some((row) => row.id === id)) return false;
    openerRef.current = findRowElement(id);
    setOpenId(id);
    return true;
  }

  // A job the chat named that the feed does not hold is fetched and opened
  // all the same: telling the person it is "not in the feed" answered a
  // question they had not asked. Only a job JobDekho no longer has at all is
  // reported, since a click that does nothing reads as broken.
  function openOutside(id) {
    fetchPosting(id).then((posting) => {
      if (!posting) throw new Error('gone');
      openerRef.current = null;
      setOutside(posting);
      setOpenId(id);
    }).catch(() => notify({ title: 'That job is gone', detail: 'JobDekho no longer holds it; a scrape removed it after the answer was written.' }));
  }

  useEffect(() => onOpenPostingRequest((id) => {
    if (!openById(id)) openOutside(id);
  }), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  function openFromClick(posting, element) {
    openerRef.current = element;
    setOpenId(posting.id);
  }

  function close() {
    setOpenId(null);
    openerRef.current?.focus();
  }

  // Closed by a press somewhere else: focus stays where that press put it,
  // and the list does not jump back to a row scrolled out of view.
  function dismiss() {
    setOpenId(null);
  }

  // The feed's own status update only reaches the rows it loaded, so a job
  // opened from outside them is updated here as well.
  function patchOutside(id, status) {
    setOutside((posting) => (posting?.id === id ? { ...posting, status } : posting));
  }

  return { opened, openFromClick, openById, close, dismiss, patchOutside };
}
