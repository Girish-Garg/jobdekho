import { useEffect, useState } from 'react';
import { relativeDay } from '../lib/time.js';
import CoverLetterDocs from './CoverLetterDocs.jsx';

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';

// The letter is editable before it is copied or made a document, since a
// person always tweaks a name or a detail. Edits live in this component's
// state and go only into a document made from here (see CoverLetterDocs.jsx);
// the saved answer is never rewritten, so reopening the posting shows the
// draft as it was written, not as it was last edited.
export default function CoverLetterResult({ record, providers, tailored = false, onMakeLetter, onMakeBoth }) {
  const { result, createdAt, provider } = record;
  const label = providers.find((p) => p.id === provider)?.label ?? provider;
  const [text, setText] = useState(result.letter);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // A fresh letter replaces whatever draft was on screen; keeping the old
  // text after "Write again" would show yesterday's edits next to today's
  // "Draws on" list.
  useEffect(() => {
    setText(result.letter);
    setCopied(false);
    setCopyError(false);
  }, [result.letter]);

  function onChange(event) {
    setText(event.target.value);
    setCopied(false);
    setCopyError(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={onChange}
        rows={10}
        className="w-full rounded-md border border-line bg-paper p-2 text-sm leading-relaxed text-ink"
      />
      <p className="text-xs text-muted">Edit freely: the documents below are made from the text as it is here.</p>

      <CoverLetterDocs text={text} tailored={tailored} onMakeLetter={onMakeLetter} onMakeBoth={onMakeBoth} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="btn btn-quiet font-normal">
          {copied ? 'Copied' : 'Copy'}
        </button>
        {copyError && <span className="text-sm text-ember">Could not copy, select the text and copy it by hand.</span>}
      </div>

      {result.usedFromResume?.length > 0 && (
        <div>
          <p className={`${LABEL} text-muted`}>Draws on</p>
          <ul className="mt-0.5 text-sm text-ink/80">
            {result.usedFromResume.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      {result.notClaimed?.length > 0 && (
        <div>
          <p className={`${LABEL} text-muted`}>Left out because your resume does not show it</p>
          <ul className="mt-0.5 text-sm text-ink/80">
            {result.notClaimed.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      <p className="font-mono text-xs text-muted">Written {relativeDay(createdAt)} by {label}</p>
    </div>
  );
}
