import { initials } from './CompanyMark.jsx';
import { CompareIcon, DocumentIcon, MailIcon, SparkleIcon } from './Icon.jsx';

// What kind of chat it is, at a glance, the same in the header and in the
// switcher: a job's company in the feed's neutral tile, two arrows for a
// comparison, the document's own tile from the Resume page, and the AI's
// sparkle for a general chat.
const SIZES = { md: 'h-9 w-9 rounded-xl text-xs', sm: 'h-7 w-7 rounded-lg text-[10px]' };
const ICON = { md: 15, sm: 13 };
const NEUTRAL = 'bg-select text-muted ring-1 ring-inset ring-line';

function look(view) {
  if (view?.kind === 'job') return { tone: `${NEUTRAL} font-display font-extrabold tracking-tight`, text: initials(view.jobs?.[0]?.company) };
  if (view?.kind === 'compare') return { tone: NEUTRAL, Icon: CompareIcon };
  if (view?.kind === 'document') {
    const letter = view.documents?.[0]?.kind === 'cover-letter';
    return letter ? { tone: 'bg-select text-ink', Icon: MailIcon } : { tone: 'bg-primary/10 text-primary', Icon: DocumentIcon };
  }
  return { tone: 'bg-primary/10 text-primary', Icon: SparkleIcon };
}

export default function ChatMark({ view, size = 'md' }) {
  const { tone, text, Icon } = look(view);
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center ${SIZES[size] ?? SIZES.md} ${tone}`}>
      {Icon ? <Icon size={ICON[size] ?? ICON.md} /> : text}
    </span>
  );
}
