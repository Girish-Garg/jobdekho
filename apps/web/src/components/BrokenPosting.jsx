import Card from './ui/Card.jsx';
import CopyDetailsButton from './CopyDetailsButton.jsx';
import { WarningIcon } from './Icon.jsx';

// One posting the feed could not draw, in its place among the rest, so the
// feed goes on around it: a row in the list (with the cells a grid row
// holds) or a card in the grid. The posting's own data is the likeliest
// thing that broke it, so only plain text from it is shown.
const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

export default function BrokenPosting({ posting, report, card = false }) {
  const what = [text(posting?.title), text(posting?.company)].filter(Boolean).join(' at ');
  const icon = <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ember/10 text-ember"><WarningIcon size={16} /></span>;
  const words = (
    <>
      <span className="block text-sm font-semibold text-ink">This posting could not be shown</span>
      {what && <span className="block truncate text-xs text-muted">{what}</span>}
    </>
  );
  const copy = <CopyDetailsButton text={report} size="sm" />;

  if (card) {
    return (
      <Card variant="panel" role="alert" className="flex items-center gap-3 border-ember/25 bg-ember/5">
        {icon}<span className="min-w-0 flex-1">{words}</span>{copy}
      </Card>
    );
  }
  return (
    <div role="row" className="flex items-center gap-3 border-b border-line bg-ember/5 px-4 py-3 first:rounded-t-[11px] last:rounded-b-[11px] last:border-b-0">
      <span role="gridcell">{icon}</span>
      <span role="gridcell" className="min-w-0 flex-1">{words}</span>
      <span role="gridcell">{copy}</span>
    </div>
  );
}
