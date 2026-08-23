import { useState } from 'react';
import { applyProfileFilter } from '../api.js';

// Seeding the notification filter is a separate, explicit action rather than
// a side effect of saving: it overwrites parts of a filter the user may have
// tuned by hand, so it asks first and says exactly what it replaces.
export default function ApplyToAlerts() {
  const [step, setStep] = useState('idle');
  const [error, setError] = useState('');

  async function confirm() {
    setStep('busy');
    setError('');
    try {
      await applyProfileFilter();
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('idle');
    }
  }

  if (step === 'confirm') {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
        <p className="text-sm text-ink">
          This replaces the keywords, levels, degree ceiling and locations on your
          saved notification filter with ones built from this profile. Anything you
          set there by hand for those fields is overwritten; your other settings keep
          their values.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={confirm}
            className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition hover:opacity-90"
          >
            Overwrite my filter
          </button>
          <button
            type="button"
            onClick={() => setStep('idle')}
            className="rounded-full border border-line px-4 py-1.5 text-sm text-muted transition hover:border-ink hover:text-ink"
          >
            Keep my filter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={step === 'busy'}
          onClick={() => setStep('confirm')}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60"
        >
          {step === 'busy' ? 'Applying...' : 'Use this for my alerts'}
        </button>
        {step === 'done' && <span className="text-sm text-muted">Alerts updated.</span>}
        {error && <span className="text-sm text-ember">{error}</span>}
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Rewrites part of the notification filter in Settings to match this profile.
      </p>
    </div>
  );
}
