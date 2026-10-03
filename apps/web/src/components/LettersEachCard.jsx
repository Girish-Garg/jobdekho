import Card from './ui/Card.jsx';
import Chip from './ui/Chip.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import { PenIcon } from './Icon.jsx';

const STATUS = {
  written: ['applied', 'Written'],
  failed: ['quiet', 'Not written'],
  skipped: ['quiet', 'Skipped'],
};

// "Cover letter for each" as its card in the comparison: one row per job,
// written or not and why, each letter saved with its own job and shown in
// that job's chat, which its row opens (see the server's chat/letters-each.js).
export default function LettersEachCard({ combined, onOpenChat }) {
  const letters = combined.letters ?? [];
  return (
    <Card as="section" variant="list" aria-label="Cover letters" className="bg-paper">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <PenIcon size={15} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Eyebrow as="span" primary>Cover letters</Eyebrow>
          <span className="text-sm font-medium text-ink">
            {letters.filter((letter) => letter.status === 'written').length} of {letters.length} written
          </span>
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-line border-t border-line bg-panel">
        {letters.map((letter) => {
          const [tone, word] = STATUS[letter.status] ?? STATUS.failed;
          const name = letter.company || letter.title || 'A job no longer listed';
          return (
            <li key={letter.postingId} className="flex flex-col gap-1 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={letter.title ?? ''}>
                  {[letter.title, letter.company].filter(Boolean).join(' · ') || name}
                </span>
                <Chip tone={tone} className="shrink-0">{word}</Chip>
              </div>
              {letter.error && <p className="text-xs text-muted">{letter.error}</p>}
              {letter.chatId && (
                <button type="button" onClick={() => onOpenChat(letter.chatId)} className="link self-start text-xs">
                  Open {name}&apos;s chat
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
