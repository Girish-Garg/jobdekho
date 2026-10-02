import Chip from './ui/Chip.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import { ExternalLinkIcon } from './Icon.jsx';

// Where an answer from the web came from, as the server let the links
// through (http and https only, see apps/server/src/chat/web-parse.js).
// Each shows its site rather than its whole address, which is mostly noise
// at this size; the full address is the link and its title.
function site(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function ChatSources({ sources }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>Sources</Eyebrow>
      <ul aria-label="Sources" className="flex flex-wrap gap-1.5">
        {sources.map((url) => (
          <li key={url} className="min-w-0 max-w-full">
            <Chip
              as="a"
              tone="line"
              href={url}
              target="_blank"
              rel="noreferrer"
              title={url}
              className="group max-w-[15rem] gap-1.5 py-1 pl-2.5 font-normal transition-colors duration-fast hover:border-edge hover:bg-select/60"
            >
              <span className="truncate">{site(url)}</span>
              <ExternalLinkIcon size={11} className="text-muted transition-colors duration-fast ease group-hover:text-ink" />
            </Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}
