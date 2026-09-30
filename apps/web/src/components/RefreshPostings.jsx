import { useScrape } from '../lib/useScrape.js';
import { useNow } from '../lib/useNow.js';
import { refreshStatus } from '../lib/refreshStatus.js';
import Svg from './IconSvg.jsx';

const TONE = { busy: 'text-ink', error: 'text-ember', done: 'text-applied', idle: 'text-muted' };

function RefreshGlyph(props) {
  return <Svg {...props}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v2.5H11" /></Svg>;
}

// The feed's own way to fetch new postings, so nobody has to open a terminal
// for `npm run scrape`. Beside the button, one line: how far a refresh has
// got while it runs, what it found once it is done, and otherwise how old
// the postings are, counted on by the minute. The run belongs to the server
// (see lib/useScrape.js), so leaving the page does not stop it.
export default function RefreshPostings() {
  const { scrape, finished, start } = useScrape();
  const running = Boolean(scrape?.running);
  const now = useNow(!running, 60 * 1000);
  const status = refreshStatus(scrape, { finished, now });

  return (
    <div className="flex items-center gap-2.5">
      <span aria-live="polite" title={status.title} className={`tnum text-sm ${TONE[status.tone]}`}>
        {status.text}
      </span>
      <button
        type="button"
        onClick={start}
        disabled={running}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors duration-fast ease hover:bg-primary/15 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-primary/10"
      >
        {running
          ? <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
          : <RefreshGlyph size={14} />}
        Refresh postings
      </button>
    </div>
  );
}
