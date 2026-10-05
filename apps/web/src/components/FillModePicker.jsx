import { useId } from 'react';
import ReviewTag from './ReviewTag.jsx';
import Button from './ui/Button.jsx';
import IconButton from './ui/IconButton.jsx';
import { CloseIcon, SparkleIcon } from './Icon.jsx';

const MODES = [
  { id: 'smart', name: 'Smart add', tag: 'Recommended', text: 'Adds what is new, updates what the resume has newer, and skips what you already have.' },
  { id: 'overwrite', name: 'Overwrite', text: "Your sections become the resume's. Anything not on it is removed." },
];

// How the resume should meet a profile that already holds something, asked
// before the AI is (see resumeReview.js for what each one offers). Either
// way every change is shown before anything is saved, which is why the
// heavier choice needs no warning of its own: its removals arrive unticked.
// The close goes back to the button without asking anything.
export default function FillModePicker({ mode, onMode, onRead, onCancel }) {
  const headingId = useId();
  const name = useId();

  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-2">
        <p id={headingId} className="text-sm font-semibold text-ink">Fill in from this resume</p>
        <IconButton size="xs" label="Cancel" onClick={onCancel}>
          <CloseIcon size={10} />
        </IconButton>
      </div>
      <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-2">
        {MODES.map((option) => {
          const on = option.id === mode;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer flex-col gap-1.5 rounded-lg border px-2.5 py-3 transition-colors duration-fast ease-ease ${on ? 'border-primary/50 bg-primary/5' : 'border-line hover:border-edge'}`}
            >
              {/* The rail is narrow: should the tag not fit beside the name,
                  it drops under it rather than breaking the name in two. */}
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <input type="radio" name={name} value={option.id} checked={on} onChange={() => onMode(option.id)} className="h-4 w-4 shrink-0 accent-primary" />
                <span className="whitespace-nowrap text-sm font-semibold text-ink">{option.name}</span>
                {option.tag && <ReviewTag kind="new" className="ml-auto">{option.tag}</ReviewTag>}
              </span>
              <span className="pl-6 text-xs leading-relaxed text-muted">{option.text}</span>
            </label>
          );
        })}
      </div>
      <Button variant="tint" onClick={onRead} className="mt-0.5 w-full gap-2 py-2">
        <SparkleIcon size={14} />
        Read the resume
      </Button>
      <p className="text-center text-[11px] text-muted">You see every change before anything is saved</p>
    </div>
  );
}
