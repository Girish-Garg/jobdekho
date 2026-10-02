import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import { hostOf } from '../lib/applyControl.js';
import { WindowIcon } from './Icon.jsx';

// In the browser frame's place while the normal window is open (see
// lib/useSignInWindow.js): what it is, what to do in it, and that closing it
// is all it takes to carry on. Continue does the same for a person who would
// rather press than close a window.
export default function ApplySignInWait({ url, onContinue, onClose }) {
  const host = hostOf(url) || 'the site';
  return (
    <Card as="section" variant="inset" aria-label="Signing in in a normal window" className="flex min-h-[24rem] flex-1 flex-col items-center justify-center border-edge bg-overlay p-8 text-center">
      <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
        <WindowIcon size={22} />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold text-ink">Sign in, in the window that opened</h2>
      <ol className="mt-4 flex max-w-sm flex-col gap-2 text-left text-sm text-muted">
        <li><span className="font-semibold text-ink">1.</span> A normal browser window opened at {host}. Nothing drives it, so Google lets you sign in.</li>
        <li><span className="font-semibold text-ink">2.</span> Sign in there, any way you like.</li>
        <li><span className="font-semibold text-ink">3.</span> Close that window. Apply assist opens again, signed in.</li>
      </ol>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={onContinue}>I&apos;ve signed in, continue</Button>
        <Button variant="ghost" onClick={onClose}>Close Apply assist</Button>
      </div>
      <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
        <span aria-hidden="true" className="breathe h-1.5 w-1.5 rounded-full bg-primary" />
        Waiting for the window to close
      </p>
    </Card>
  );
}
