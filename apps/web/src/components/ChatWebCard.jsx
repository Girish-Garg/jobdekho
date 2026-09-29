import ChatText from './ChatText.jsx';
import ChatSources from './ChatSources.jsx';
import { GlobeIcon } from './Icon.jsx';

// What a web search added to an answer, in teal, the colour of things from
// outside the app, so it is never mistaken for an answer from the person's
// own data. The header says what went out: the question and the job's public
// details, never the profile (see the server's chat/web-prompt.js).
export default function ChatWebCard({ web }) {
  return (
    <section aria-label="From the web" className="overflow-hidden rounded-xl border border-accent/25 bg-panel">
      <div className="flex items-start gap-2.5 border-b border-accent/20 bg-accent/10 px-3 py-2.5">
        <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
          <GlobeIcon size={13} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-accent">From the web</p>
          <p className="text-xs text-muted">Searched with your question and the job&apos;s public details, not your profile.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-3 py-3">
        {web.answer && <ChatText text={web.answer} />}
        {web.sources.length > 0 && <ChatSources sources={web.sources} />}
      </div>
    </section>
  );
}
