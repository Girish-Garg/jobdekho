import { useState } from 'react';
import { useListKeys } from './useListKeys.js';

// The feed's selection (the keyboard highlight) and how it follows the pane.
// Selection is separate from "open": only Enter or a click commits to viewing
// a posting. A pane put away by the pointer (a press outside it, or its close
// button) lets go of the row or card too, since a highlight left on a closed
// job read as if it were still open. Escape keeps it, so j and k carry on from
// where the keyboard was; a second Escape clears it.
//
// `pane` is useOpenPosting's result; `triage` is useTriage's.
export function usePostingSelection(rows, pane, triage) {
  const [selectedId, setSelectedId] = useState(null);

  const letGo = (close) => () => {
    close();
    setSelectedId(null);
  };

  useListKeys({
    rows,
    selectedId,
    onSelect: setSelectedId,
    onOpen: pane.openById,
    onStatus: triage.setStatus,
    onUndo: triage.undo,
    onClear: () => (pane.opened ? pane.close() : setSelectedId(null)),
  });

  return {
    selectedId,
    setSelectedId,
    openFromClick(posting, element) {
      setSelectedId(posting.id);
      pane.openFromClick(posting, element);
    },
    closePane: letGo(pane.close),
    dismissPane: letGo(pane.dismiss),
  };
}
