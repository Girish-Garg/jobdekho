import { useAdzunaKey } from '../lib/useAdzunaKey.js';
import { keyStatus, lastRunStatus } from '../lib/adzunaStatus.js';
import SettingsCard from './SettingsCard.jsx';
import AdzunaKeyFields from './AdzunaKeyFields.jsx';
import { CheckIcon, SearchIcon } from './Icon.jsx';

const TONE = { ok: 'text-applied', error: 'text-ember', muted: 'text-muted' };
const LINK = 'link';
const OUTLINE = 'btn btn-quiet font-normal';

// The person's own free Adzuna key, so Adzuna joins every refresh without
// anyone editing .env (see the server's api/adzuna.js). What it says about
// Adzuna is Adzuna's own description of itself, not a list of sites: which
// boards its feed includes is Adzuna's to say, and JobDekho cannot check.
export default function AdzunaCard() {
  const { view, appId, setAppId, appKey, setAppKey, busy, note, save, check, remove } = useAdzunaKey();
  const status = keyStatus(view);
  const last = lastRunStatus(view?.lastRun);
  const typed = Boolean(appId.trim() && appKey.trim());

  return (
    <SettingsCard
      icon={<SearchIcon size={18} />}
      title="Adzuna"
      hint="Adds Adzuna's listings for software roles in India to every refresh, with a free key of your own."
    >
      <p className="text-sm text-muted">
        Adzuna is a job search engine. It says it searches thousands of job sites, India&apos;s major job boards among
        them, and gathers their ads into one feed. It is free, but needs a key of its own. JobDekho sends Adzuna only
        its search terms and your key, never your profile or resume.
      </p>
      <p className="mt-2 text-sm text-ink">
        Get a free app id and key at{' '}
        <a href="https://developer.adzuna.com" target="_blank" rel="noreferrer" className={LINK}>developer.adzuna.com</a>
        , then paste both here.
      </p>

      <p className={`mt-4 flex items-center gap-1.5 text-sm font-semibold ${TONE[status.tone]}`}>
        {status.tone === 'ok' && <CheckIcon size={12} />}
        {status.text}
      </p>
      {last && <p title={last.title} className={`mt-0.5 text-sm ${TONE[last.tone]}`}>{last.text}</p>}

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed && !busy) save();
        }}
      >
        <AdzunaKeyFields appId={appId} appKey={appKey} keyEnd={view?.keyEnd} onAppId={setAppId} onAppKey={setAppKey} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!typed || Boolean(busy)}
            className="btn btn-primary"
          >
            {busy === 'save' ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={check} disabled={Boolean(busy) || !(appKey.trim() || view?.configured)} className={OUTLINE}>
            {busy === 'check' ? 'Checking...' : 'Check key'}
          </button>
          {view?.from === 'settings' && (
            <button type="button" onClick={remove} disabled={Boolean(busy)} className="text-sm font-medium text-ember hover:underline disabled:opacity-60">
              Remove
            </button>
          )}
        </div>
      </form>

      {/* Always mounted, so the outcome of each action is read out. */}
      <p aria-live="polite" className={`mt-3 min-h-[1.25rem] text-sm ${TONE[note?.tone] ?? ''}`}>{note?.text ?? ''}</p>
      <p className="text-xs text-muted">The free key allows 250 requests a day. A refresh uses at most 4, and Check key uses 1.</p>
    </SettingsCard>
  );
}
