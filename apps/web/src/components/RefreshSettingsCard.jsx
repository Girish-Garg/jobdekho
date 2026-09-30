import { useId } from 'react';
import { useScrape } from '../lib/useScrape.js';
import { useRefreshSetting } from '../lib/useRefreshSetting.js';
import { refreshStatus } from '../lib/refreshStatus.js';
import SettingsCard from './SettingsCard.jsx';
import RefreshLastRun from './RefreshLastRun.jsx';
import { CheckIcon, HistoryIcon } from './Icon.jsx';

const SAVED = {
  saving: <span className="text-xs text-muted">Saving...</span>,
  saved: <span className="inline-flex items-center gap-1 text-xs font-semibold text-applied"><CheckIcon size={12} /> Saved</span>,
  error: <span className="text-xs font-semibold text-ember">Not saved</span>,
};

const TONE = { busy: 'text-ink', error: 'text-ember', done: 'text-applied', idle: 'text-muted' };

// Where the postings come from and how fresh they are kept: the daily
// refresh, saved as it is flipped like every other setting; the last run and
// the sources it missed; and a refresh on demand, which the feed's header
// offers too.
export default function RefreshSettingsCard() {
  const { scrape, finished, start } = useScrape();
  const { autoRefresh, ready, saved, toggle } = useRefreshSetting();
  const running = Boolean(scrape?.running);
  const status = refreshStatus(scrape, { finished });

  return (
    <SettingsCard
      icon={<HistoryIcon size={18} />}
      title="Postings"
      hint="JobDekho fetches new postings from the job boards and careers pages it follows, from this computer."
      note={<span aria-live="polite" className="shrink-0 pt-1">{SAVED[saved] ?? null}</span>}
    >
      <AutoRefreshSwitch on={autoRefresh} disabled={!ready} onChange={toggle} />
      <RefreshLastRun lastRun={scrape?.lastRun ?? null} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary transition-opacity duration-fast ease hover:opacity-90 disabled:cursor-default disabled:opacity-60"
        >
          Refresh now
        </button>
        {/* Always mounted, since a live region added with its words already
            in it is often not read out. Idle, the last run above says it. */}
        <span aria-live="polite" title={status.title} className={`tnum text-sm ${TONE[status.tone]}`}>
          {status.tone === 'idle' ? '' : status.text}
        </span>
      </div>
    </SettingsCard>
  );
}

function AutoRefreshSwitch({ on, disabled, onChange }) {
  const label = useId();
  const hint = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm">
        <span id={label} className="block font-semibold text-ink">Refresh once a day on its own</span>
        <span id={hint} className="text-muted">While JobDekho is running, it fetches new postings whenever the last refresh is a day old.</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={label}
        aria-describedby={hint}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-fast ease disabled:opacity-60 ${
          on ? 'border-primary bg-primary' : 'border-edge bg-select'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-px top-px h-5 w-5 rounded-full shadow-raise transition-transform duration-fast ease ${
            on ? 'translate-x-5 bg-on-primary' : 'bg-panel'
          }`}
        />
      </button>
    </div>
  );
}
