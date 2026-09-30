import { linkedinStatus } from '../lib/linkedinStatus.js';
import SettingSwitch from './SettingSwitch.jsx';

// LinkedIn is the one source that does not allow automated access, so it is
// the one a person can leave out. The hint says so plainly and says what
// JobDekho does to keep the risk small (the server's guard, see the
// scraper's linkedin-guard.js); the line below says where that guard stands,
// from the state the card already polls (`status`, see useScrape.js).
const HINT = 'LinkedIn does not allow automated access. JobDekho reads its public job search at most once a day, '
  + 'slowly, and pauses for days if LinkedIn pushes back. Turn it off if you would rather not take the risk.';

export default function LinkedInSetting({ on, disabled, onChange, status }) {
  const line = linkedinStatus(on, status);
  return (
    <SettingSwitch label="Include LinkedIn" hint={HINT} on={on} disabled={disabled} onChange={onChange}>
      <span className={`mt-1 block tnum ${line.paused ? 'font-medium text-ember' : 'text-muted'}`}>
        {line.text}
      </span>
    </SettingSwitch>
  );
}
