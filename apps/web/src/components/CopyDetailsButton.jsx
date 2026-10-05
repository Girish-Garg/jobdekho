import { useEffect, useRef, useState } from 'react';
import { toClipboard } from '../lib/clipboard.js';
import Button from './ui/Button.jsx';
import { CopyIcon } from './Icon.jsx';

// Puts an error report on the clipboard for a bug report, and says so for a
// moment. Nothing is sent anywhere: the person pastes it where they choose.
// A browser that refuses the clipboard says it could not, rather than
// claiming a copy that never happened.
const SAID_MS = 2500;

export default function CopyDetailsButton({ text, label = 'Copy details', size, className = '' }) {
  const [said, setSaid] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    setSaid((await toClipboard(text)) ? 'Copied' : 'Could not copy');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaid(null), SAID_MS);
  }

  return (
    <Button size={size} onClick={copy} className={`gap-1.5 font-medium ${className}`.trim()}>
      <CopyIcon size={size === 'sm' ? 12 : 14} />
      <span aria-live="polite">{said ?? label}</span>
    </Button>
  );
}
