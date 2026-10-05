import SettingsCard from './SettingsCard.jsx';
import Button from './ui/Button.jsx';
import CopyDetailsButton from './CopyDetailsButton.jsx';
import { WarningIcon } from './Icon.jsx';

// A Settings card that could not be drawn, kept in its place under its own
// name, so the index beside the page still leads somewhere and the other
// cards go on working. Settings save as they are picked, so what was saved
// in it before is kept.
export default function BrokenSection({ title, report, retry }) {
  return (
    <SettingsCard icon={<WarningIcon size={18} />} title={title} hint="What you saved here before is kept.">
      <div role="alert" className="rounded-xl border border-ember/25 bg-ember/5 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-0.5 text-ember"><WarningIcon size={16} /></span>
          <p className="text-sm text-ink/85">This card could not be shown. The rest of Settings still works.</p>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
          <Button size="sm" onClick={retry}>Try again</Button>
          <CopyDetailsButton text={report} size="sm" />
        </div>
      </div>
    </SettingsCard>
  );
}
