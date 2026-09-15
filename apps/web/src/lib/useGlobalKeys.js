import { useEffect } from 'react';

const FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';

// A shortcut typed into a search box or a select is text, not a command, so
// every key here backs off the moment focus is in a field. The palette's own
// arrow/enter/escape handling lives inside CommandPalette itself and never
// goes through this hook, so that input is exempt by construction rather
// than by a special case here.
function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return typeof target.closest === 'function' && Boolean(target.closest(FIELD_SELECTOR));
}

// The three shortcuts the chrome owns. j/k/Enter/s/a/d/u belong to the feed's
// own key layer; binding them here too would fire both handlers on one
// keypress, so this hook only ever touches Cmd/Ctrl+K, "?" and "/".
export function useGlobalKeys({ onOpenPalette, onOpenHelp, onFocusSearch } = {}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (isTypingTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (!onOpenPalette) return;
        event.preventDefault();
        onOpenPalette();
        return;
      }

      if (event.key === '?') {
        if (!onOpenHelp) return;
        event.preventDefault();
        onOpenHelp();
        return;
      }

      if (event.key === '/') {
        if (!onFocusSearch) return;
        event.preventDefault();
        onFocusSearch();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenPalette, onOpenHelp, onFocusSearch]);
}
