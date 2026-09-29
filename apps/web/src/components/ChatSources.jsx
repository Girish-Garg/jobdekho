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
    <ul aria-label="Sources" className="flex flex-wrap gap-1.5">
      {sources.map((url) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title={url}
            className="inline-flex max-w-[16rem] items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-muted transition-colors duration-fast ease hover:border-edge hover:text-ink"
          >
            <span className="truncate">{site(url)}</span>
            <ExternalLinkIcon size={12} />
          </a>
        </li>
      ))}
    </ul>
  );
}
