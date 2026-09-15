import { useRef, useState } from 'react';
import { findRowElement } from './scrollSelectedIntoView.js';

// Which posting fills the detail slot, kept apart from row selection so j/k
// can move the highlight without popping a dialog or repainting the pane on
// every keystroke - only a click or Enter commits to opening one.
export function useOpenPosting(rows) {
  const [openId, setOpenId] = useState(null);
  // Focus has to land back on the exact row that opened the detail, and the
  // row is not remounted, so the element itself is the cheapest handle.
  const openerRef = useRef(null);
  const opened = rows.find((row) => row.id === openId) || null;

  function openFromClick(posting, element) {
    openerRef.current = element;
    setOpenId(posting.id);
  }

  function openById(id) {
    if (!rows.some((row) => row.id === id)) return;
    openerRef.current = findRowElement(id);
    setOpenId(id);
  }

  function close() {
    setOpenId(null);
    openerRef.current?.focus();
  }

  return { opened, openFromClick, openById, close };
}
