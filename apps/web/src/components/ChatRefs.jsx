import Card from './ui/Card.jsx';
import CountBadge from './ui/CountBadge.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import ChatMonogram from './ChatMonogram.jsx';
import { ArrowRightIcon } from './Icon.jsx';

// How far along the fit is, drawn the way the feed's own meter reads, with
// the number beside it so the bar is never the only way to tell.
function Fit({ fit }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted tnum">
      <span aria-hidden="true" className="h-1 w-8 overflow-hidden rounded-full bg-ink/10">
        <span className="block h-full rounded-full bg-ink/45" style={{ width: `${Math.max(0, Math.min(100, fit))}%` }} />
      </span>
      fit {fit}
    </span>
  );
}

// The postings an answer named, as the server checked them (see
// apps/server/src/chat/refs.js): only ids that turn put in front of the
// model, worded from the store rather than by it. A click opens that posting
// in the pane, the one thing an answer could not do before. The title gets
// the whole first line, since it is what tells two roles at one company apart.
export default function ChatRefs({ refs, onOpen }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow className="flex items-center gap-1.5">
        Jobs in JobDekho
        <CountBadge n={refs.length} className="bg-primary/10 text-[10px] font-bold normal-case leading-4 tracking-normal text-primary" />
      </Eyebrow>
      <Card as="ul" variant="list" aria-label="Jobs in this answer" className="flex flex-col divide-y divide-line bg-paper">
        {refs.map((ref) => (
          <li key={ref.id}>
            <button
              type="button"
              onClick={() => onOpen(ref.id)}
              className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-fast ease hover:bg-select"
            >
              <ChatMonogram name={ref.company} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-ink" title={ref.title}>{ref.title}</span>
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-muted">{ref.company}</span>
                  {ref.fit !== null && ref.fit !== undefined && <Fit fit={ref.fit} />}
                </span>
              </span>
              <ArrowRightIcon className="text-muted transition duration-fast ease group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          </li>
        ))}
      </Card>
    </div>
  );
}
