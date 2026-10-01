import { hostOf } from '../lib/applyControl.js';
import { CheckIcon, GlobeIcon, WarningIcon } from './Icon.jsx';

const FILLED = new Set(['filled', 'attached']);

// What happened on the page, as the assistant tells it, above the chat: the
// page opened, what JobDekho filled from the profile, what the page would not
// take, and what needs the person, each picked out in the live view on hover.
// A question the assistant can help with starts a reply in the box when it is
// pressed; one that is the person's alone (a password, a code) only says so.
function why(row) {
  if (row.askable === false) return 'yours to do';
  return row.note === 'Needs your answer.' ? 'I can draft' : 'tell me';
}

function Step({ tone, icon, children, sub }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${tone}`}>{icon}</span>
      <div className="min-w-0 flex-1 text-sm text-ink">
        <p>{children}</p>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
    </li>
  );
}

export default function ApplyTimeline({ view, onHover, onPick }) {
  if (!view) return null;
  const rows = view.rows ?? [];
  const filled = rows.filter((row) => FILLED.has(row.status));
  const failed = rows.filter((row) => row.status === 'failed');
  const need = rows.filter((row) => row.status === 'you');
  const hover = (row) => ({ onMouseEnter: () => onHover(row.fid), onMouseLeave: () => onHover(null), onFocus: () => onHover(row.fid), onBlur: () => onHover(null) });

  return (
    <ol aria-label="What happened on this page" className="flex flex-col gap-4">
      <Step tone="bg-select text-muted" icon={<GlobeIcon size={12} />} sub={view.title}>
        Opened <span className="font-semibold">{hostOf(view.url) || 'the application'}</span>
      </Step>
      {filled.length > 0 && (
        <Step tone="bg-applied/15 text-applied" icon={<CheckIcon size={12} />} sub={filled.map((row) => row.label).join(', ')}>
          Filled {filled.length} from your profile
        </Step>
      )}
      {failed.length > 0 && (
        <Step tone="bg-ember/15 text-ember" icon={<WarningIcon size={12} />} sub={failed.map((row) => row.label).join(', ')}>
          {failed.length === 1 ? 'One did not take: try it yourself' : `${failed.length} did not take: try them yourself`}
        </Step>
      )}
      {need.length > 0 && (
        <li className="rounded-xl border border-primary/30 bg-primary/5 p-2">
          <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-primary">{need.length} need you</p>
          <ul>
            {need.map((row) => (
              <li key={row.fid}>
                {/* aria-disabled, not disabled: a disabled button hears no
                    hover, and the field should still be picked out. */}
                <button
                  type="button"
                  aria-disabled={row.askable === false || undefined}
                  onClick={() => row.askable !== false && onPick(row)}
                  {...hover(row)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink transition-colors duration-fast ease hover:bg-select aria-disabled:cursor-default"
                >
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  <span className="shrink-0 text-xs text-muted">{why(row)}</span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      )}
    </ol>
  );
}
