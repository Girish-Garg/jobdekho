import { describeMade, isJobItem } from '../lib/madeByAi.js';
import Button from './ui/Button.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import { DocumentIcon, MailIcon, PenIcon, ShieldCheckIcon, SparkleIcon } from './Icon.jsx';

// The colours the rest of the app already gives each thing: saffron for a
// resume, neutral for a letter (see DocumentList.jsx), green for a change the
// person applied, and plain ink for a check, which only says something.
const LOOK = {
  'fake-check': { Icon: ShieldCheckIcon, tone: 'bg-ink/5 text-ink' },
  'cover-letter': { Icon: MailIcon, tone: 'bg-select text-ink' },
  'resume-tailor': { Icon: SparkleIcon, tone: 'bg-primary/10 text-primary' },
  resume: { Icon: DocumentIcon, tone: 'bg-primary/10 text-primary' },
  letter: { Icon: MailIcon, tone: 'bg-select text-ink' },
  profile: { Icon: PenIcon, tone: 'bg-applied/15 text-applied' },
};

const lookOf = (item) => {
  if (item.kind === 'document') return item.documentKind === 'cover-letter' ? LOOK.letter : LOOK.resume;
  return LOOK[item.kind] ?? LOOK.profile;
};

// Where each row leads: a job's results to that job's own chat, where they
// show, and a document to itself. A profile change to the chat it was
// offered in, when that chat is still there.
function Links({ item, links }) {
  const link = (label, act) => <Button variant="quiet" size="sm" className="px-2.5" onClick={act}>{label}</Button>;
  if (isJobItem(item)) return link('Show in the chat', () => links.onShowInChat(item));
  if (item.kind === 'document') return link('Open it', () => links.onOpenDocument(item.documentId));
  return item.chatId ? link('Show in the chat', () => links.onOpenChat(item.chatId)) : null;
}

// One thing the AI made: what it is, what it is called and what it belongs
// to, and the way back to it.
export default function MadeByAiRow({ item, links }) {
  const { word, title, detail } = describeMade(item);
  const { Icon, tone } = lookOf(item);
  return (
    <li className="flex gap-3 rounded-xl px-2 py-2.5">
      <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <Eyebrow>{word}</Eyebrow>
        <p className="truncate text-sm font-semibold text-ink" title={title}>{title}</p>
        <p className="truncate text-xs text-muted">{detail}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Links item={item} links={links} />
        </div>
      </div>
    </li>
  );
}
