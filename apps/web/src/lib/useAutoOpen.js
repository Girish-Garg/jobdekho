import { useEffect } from 'react';

// Beside the list there is always room for a posting, so the pane opens on
// the first row rather than standing empty with an instruction in it. Only
// the wide layout: in the narrow one, opening means a dialog over the feed,
// and nobody asked for one to appear by itself.
export function useAutoOpen({ enabled, opened, loading, rows, onSelect, onOpen }) {
  useEffect(() => {
    if (!enabled || opened || loading || !rows.length) return;
    onSelect(rows[0].id);
    onOpen(rows[0].id);
  }, [enabled, opened, loading, rows]);
}
