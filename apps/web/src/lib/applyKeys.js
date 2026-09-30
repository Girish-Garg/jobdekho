// A key pressed in the live view, as the message the server accepts, or null
// when the key is text (text arrives through the input events of the hidden
// textarea instead, which is what lets Hindi through an IME, dead keys and
// the emoji picker work) or not something to send at all. The server keeps
// the same closed list (apply/key-table.js) and refuses anything else.
const NAMED = new Set([
  'Enter', 'Tab', 'Backspace', 'Delete', 'Escape',
  'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown',
]);

// Editing shortcuts inside the page. Paste is not among them: the person's
// paste arrives as text, and pasting again in the page would double it.
const CHORDS = new Set(['a', 'c', 'x', 'z', 'y']);

const modsOf = (event) => ({ ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey, alt: event.altKey });

export function keyMessage(event) {
  // Mid-composition keys belong to the IME, not to the page.
  if (event.isComposing) return null;
  if (NAMED.has(event.key)) return { t: 'key', name: event.key, mods: modsOf(event) };
  const letter = event.key.length === 1 ? event.key.toLowerCase() : '';
  if ((event.ctrlKey || event.metaKey) && CHORDS.has(letter)) return { t: 'key', name: letter, mods: modsOf(event) };
  return null;
}
