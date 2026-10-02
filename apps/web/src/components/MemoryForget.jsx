import { useState } from 'react';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';

const MUTED = 'font-normal text-muted hover:text-ink';

// "Forget everything" arms instead of firing, the way deleting the profile
// does (see DeleteProfile.jsx): there is no undo, and it takes the replaced
// lines kept for an Undo as well. The confirmation sits where the button
// was, in the warning colour, so it is never mistaken for a Save.
export default function MemoryForget({ busy, onForget }) {
  const [arming, setArming] = useState(false);

  if (!arming) {
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setArming(true)}>Forget everything</Button>
      </div>
    );
  }

  async function confirm() {
    await onForget();
    setArming(false);
  }

  return (
    <Card variant="inset" role="group" aria-label="Forget everything" className="flex flex-wrap items-center justify-between gap-3 border-ember/25 bg-ember/5 px-4 py-3">
      <p className="text-sm text-ember">Everything the AI knows about you goes, and there is no undo.</p>
      <div className="flex items-center gap-2">
        <Button onClick={() => setArming(false)} className={MUTED}>Keep it</Button>
        <Button variant="danger" disabled={busy} onClick={confirm} className="disabled:opacity-60">Forget it all</Button>
      </div>
    </Card>
  );
}
