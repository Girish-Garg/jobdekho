import { useState } from 'react';
import { downloadText } from '../lib/downloadText.js';

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';
const BUTTON = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink';

// The rewrite, editable before it leaves the page: the person fixes a
// flagged number or trims a bullet, then copies or downloads exactly what is
// in the box. Edits live in this component's state and never reach the
// server, so reopening the posting shows the rewrite as the CLI produced it
// with its fact check still true of it. The parent keys this on the record's
// time so a fresh rewrite replaces the draft. Only one overlay is ever
// mounted, so a constant id can name the box.
export default function TailoredResumeText({ text, fileName }) {
  const [draft, setDraft] = useState(text);
  const [copy, setCopy] = useState('idle');

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="tailored-resume" className={`${LABEL} text-muted`}>Tailored resume</label>
      <textarea
        id="tailored-resume"
        value={draft}
        onChange={(event) => (setDraft(event.target.value), setCopy('idle'))}
        rows={22}
        spellCheck={false}
        className="w-full rounded-md border border-line bg-paper p-2 font-mono text-xs leading-relaxed text-ink"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onCopy} className={BUTTON}>{copy === 'copied' ? 'Copied' : 'Copy'}</button>
        <button type="button" onClick={() => downloadText(fileName, draft)} className={BUTTON}>Download as .txt</button>
        <span className="text-xs text-muted">Edits here stay on this page and are not saved.</span>
      </div>
      {copy === 'failed' && (
        <p role="alert" className="text-sm text-ember">Could not copy, select the text and copy it by hand.</p>
      )}
    </div>
  );
}
