import { useState } from 'react';
import { useProviders } from '../lib/useProviders.js';
import { providerFor } from '../lib/providerFor.js';
import { modesDiffer } from '../lib/resumeReview.js';
import { useFillRun } from '../lib/useFillRun.js';
import InstallHint from './InstallHint.jsx';
import FillModePicker from './FillModePicker.jsx';
import FillProgress from './FillProgress.jsx';
import AiError from './AiError.jsx';
import Button from './ui/Button.jsx';
import { SparkleIcon } from './Icon.jsx';

const INTRO = 'Filling in from the resume asks an AI CLI installed on this computer, on your own subscription or a local model.';

// The tool policy the extraction runs under on the server: none, since the
// prompt is the resume. Either CLI can take it, and the server picks the
// same one this component names (ai/select.js).
const POLICY = 'none';

// A button, not a side effect of the upload: each run spends the person's
// own CLI subscription and takes half a minute, and an automatic run on
// every corrected PDF would read like the app filling in the profile on
// its own. A run writes nothing either way: what the resume says is set
// beside the record for review (`onFound`, see resumeReview.js), and the
// card says how many changes wait there. On a profile that already holds
// something, the person first picks how the resume should meet it; on one
// that holds nothing the two ways are the same, so it just runs. The run
// itself, its Stop included, is useFillRun.js.
export default function FillFromResume({ profile, reviewing = false, onFound }) {
  const { providers, checking, refresh } = useProviders();
  const [mode, setMode] = useState('smart');
  const { step, setStep, run, error, setError, outcome, read, stop } = useFillRun({ providers, onFound });

  // The picker opens on Smart add every time: it is the one recommended.
  function start(label) {
    if (!modesDiffer(profile)) return read('smart', label);
    setMode('smart');
    return setStep('pick');
  }

  if (providers === undefined) return <p className="font-mono text-xs text-muted">Checking for an AI CLI...</p>;
  const ready = providerFor(providers, POLICY);
  if (!ready) return <InstallHint intro={INTRO} policies={[POLICY]} providers={providers} checking={checking} onRecheck={refresh} />;
  if (step === 'pick') return <FillModePicker mode={mode} onMode={setMode} onRead={() => read(mode, ready.label)} onCancel={() => setStep('idle')} />;
  if (step !== 'idle') return <FillProgress {...run} finished={step === 'done'} onStop={stop} />;

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      {/* The card's one call to action, the width of the card, in the
          shared button style so it moves like every other button. */}
      <Button variant="tint" onClick={() => start(ready.label)} className="w-full gap-2 py-2">
        <SparkleIcon size={14} />
        Fill in from resume
      </Button>
      {/* What the last run came to, while it still holds: a count of
          changes only while their review is open (see useFillRun.js). */}
      <span aria-live="polite" className="text-xs text-muted empty:hidden">
        {outcome && (reviewing || !outcome.waits) ? outcome.text : ''}
      </span>
      <AiError error={error} checking={checking} onRecheck={() => (setError(null), refresh())} />
      {/* Short and not tied to one CLI: which one runs is a setting, and the
          button says the rest. The name is still one hover away. */}
      <p title={`Runs on ${ready.label}`} className="text-center text-[11px] text-muted">Uses the AI on this computer, about 20 seconds</p>
    </div>
  );
}
