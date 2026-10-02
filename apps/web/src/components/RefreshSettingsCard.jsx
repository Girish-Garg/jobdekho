import Button from './ui/Button.jsx';
import { useScrape } from '../lib/useScrape.js';
import { useRefreshSetting } from '../lib/useRefreshSetting.js';
import { refreshStatus } from '../lib/refreshStatus.js';
import SettingsCard from './SettingsCard.jsx';
import SettingSwitch from './SettingSwitch.jsx';
import LinkedInSetting from './LinkedInSetting.jsx';
import RefreshLastRun from './RefreshLastRun.jsx';
import SourceHealthNote from './SourceHealthNote.jsx';
import { CheckIcon, HistoryIcon } from './Icon.jsx';

const SAVED = {
  saving: <span className="text-xs text-muted">Saving...</span>,
  saved: <span className="inline-flex items-center gap-1 text-xs font-semibold text-applied"><CheckIcon size={12} /> Saved</span>,
  error: <span className="text-xs font-semibold text-ember">Not saved</span>,
};

const TONE = { busy: 'text-ink', error: 'text-ember', done: 'text-applied', idle: 'text-muted' };

// Where the postings come from and how fresh they are kept: the daily
// refresh and whether it reads LinkedIn, each saved as it is flipped like
// every other setting; the last run and the sources it missed; and a
// refresh on demand, which only this card offers.
export default function RefreshSettingsCard() {
  const { scrape, finished, start } = useScrape();
  const { autoRefresh, linkedin, ready, saved, toggle, toggleLinkedin } = useRefreshSetting();
  const running = Boolean(scrape?.running);
  const status = refreshStatus(scrape, { finished });

  return (
    <SettingsCard
      icon={<HistoryIcon size={18} />}
      title="Postings"
      hint="JobDekho fetches new postings from the job boards and careers pages it follows, from this computer."
      note={<span aria-live="polite" className="shrink-0 pt-1">{SAVED[saved] ?? null}</span>}
    >
      <div className="space-y-4">
        <SettingSwitch
          label="Refresh once a day on its own"
          hint="While JobDekho is running, it fetches new postings whenever the last refresh is a day old."
          on={autoRefresh}
          disabled={!ready}
          onChange={toggle}
        />
        <LinkedInSetting on={linkedin} disabled={!ready} onChange={toggleLinkedin} status={scrape?.linkedin ?? null} />
      </div>
      <RefreshLastRun lastRun={scrape?.lastRun ?? null} />
      <SourceHealthNote health={scrape?.health ?? null} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={start} disabled={running}>
          Refresh now
        </Button>
        {/* Always mounted, since a live region added with its words already
            in it is often not read out. Idle, the last run above says it. */}
        <span aria-live="polite" title={status.title} className={`tnum text-sm ${TONE[status.tone]}`}>
          {status.tone === 'idle' ? '' : status.text}
        </span>
      </div>
    </SettingsCard>
  );
}
