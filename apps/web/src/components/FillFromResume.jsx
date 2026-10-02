import { useRef, useState } from 'react';
import { extractProfile } from '../api.js';
import { useProviders } from '../lib/useProviders.js';
import { providerFor } from '../lib/providerFor.js';
import { progressText } from '../lib/aiProgress.js';
import InstallHint from './InstallHint.jsx';
import OverwriteConfirm from './OverwriteConfirm.jsx';
import AiError from './AiError.jsx';
import { SparkleIcon } from './Icon.jsx';

const INTRO = 'Filling in from the resume asks an AI CLI installed on this computer, on your own subscription or a local model.';

// The tool policy the extraction runs under on the server: none, since the
// prompt is the resume. Either CLI can take it, and the server picks the
// same one this component names (ai/select.js).
const POLICY = 'none';

// A button, not a side effect of the upload. Each run spends the person's own
// CLI subscription and holds the form for twenty seconds or more, which is
// why the server keeps extraction apart from storing the text. The form also
// promises that a re-upload never touches hand-fixed fields, and an automatic
// run would break that on every corrected PDF. Running automatically only
// while the profile is still empty would keep the promise, but then the same
// upload behaves differently from one time to the next, which costs more
// trust than one click.
//
// Extraction overwrites every field the form edits, so anything already in
// the profile earns a confirm step first.
const hasFields = (p) =>
  p.skills.length + p.titles.length + p.locations.length > 0 || p.years != null || p.degree !== 'none';

export default function FillFromResume({ profile, onFilled }) {
  const { providers, checking, refresh } = useProviders();
  const [step, setStep] = useState('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  // Only the start event names the CLI, so its label is kept for the rest.
  const label = useRef('');

  function onEvent(event) {
    if (event.event === 'start') {
      label.current = providers.find((p) => p.id === event.provider)?.label ?? event.provider;
    }
    setProgress(progressText(event, label.current, { noun: 'Resume' }));
  }

  async function run() {
    setStep('busy');
    setError(null);
    setProgress('Starting...');
    try {
      onFilled(await extractProfile({ onEvent }));
      setStep('done');
    } catch (err) {
      setError(err);
      setStep('idle');
    }
  }

  if (providers === undefined) return <p className="font-mono text-xs text-muted">Checking for an AI CLI...</p>;
  const ready = providerFor(providers, POLICY);
  if (!ready) return <InstallHint intro={INTRO} policies={[POLICY]} providers={providers} checking={checking} onRecheck={refresh} />;
  if (step === 'confirm') return <OverwriteConfirm label={ready.label} onConfirm={run} onCancel={() => setStep('idle')} />;

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex flex-col gap-2">
        {/* The card's one call to action, the width of the card, in the
            shared button style so it moves like every other button. */}
        <button
          type="button"
          disabled={step === 'busy'}
          onClick={() => (hasFields(profile) ? setStep('confirm') : run())}
          className="btn btn-tint px-4 py-2 text-sm w-full gap-2"
        >
          <SparkleIcon size={14} />
          {step === 'busy' ? 'Filling in...' : 'Fill in from resume'}
        </button>
        <span aria-live="polite" className="text-xs text-muted empty:hidden">
          {step === 'busy' ? progress : step === 'done' ? 'Filled in. Check the fields, then save.' : ''}
        </span>
      </div>
      <AiError error={error} checking={checking} onRecheck={() => (setError(null), refresh())} />
      {/* Short and not tied to one CLI: which one runs is a setting, and the
          button says the rest. The name is still one hover away. */}
      <p title={`Runs on ${ready.label}`} className="text-center text-[11px] text-muted">Uses the AI on this computer, about 20 seconds</p>
    </div>
  );
}
