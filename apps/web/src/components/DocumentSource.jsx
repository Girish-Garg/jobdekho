import { useState } from 'react';
import { notifyError } from '../lib/toast.js';
import GuardProblems from './GuardProblems.jsx';
import ChangedNotice from './ChangedNotice.jsx';

const SAVE = 'rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow-raise transition duration-fast ease hover:brightness-110 '
  + 'disabled:bg-ink/10 disabled:text-muted disabled:shadow-none disabled:hover:brightness-100';

// The document's LaTeX, edited by hand. A save is a new version (restorable
// from Versions) and compiles at once; the LaTeX guard stands in front of
// that compile, so what it refuses shows here, over the lines to fix. The
// server keeps a refused source as written: a half-typed line is a normal
// state for a source being edited.
export default function DocumentSource({ draft, pdf, onSave }) {
  const [saving, setSaving] = useState(false);
  const refused = pdf.failure && ['unsafe', 'compile_failed'].includes(pdf.failure.kind) ? pdf.failure : null;

  async function save() {
    if (!draft.dirty || saving) return;
    setSaving(true);
    try {
      await onSave();
    } catch (err) {
      notifyError(err, 'Could not save the source');
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  }

  const note = pdf.busy ? 'Compiling...' : draft.dirty ? 'Unsaved. Ctrl+S saves it as a new version.' : 'Saved. Every save is a version you can restore.';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-paper p-4">
      {draft.stale && (
        <ChangedNotice
          title="This document changed while you were editing"
          detail="A chat change or the header from your profile was applied, or a version restored. Loading it drops your unsaved edits; keeping yours means your next save replaces it."
          loadLabel="Load the new version"
          onLoad={draft.load}
          onKeep={draft.keep}
        />
      )}
      {refused && (
        <GuardProblems title={refused.kind === 'unsafe' ? 'The saved source was not compiled. The LaTeX guard refused:' : refused.message} problems={refused.problems ?? []} />
      )}
      <textarea
        aria-label="LaTeX source"
        spellCheck={false}
        value={draft.draft}
        onChange={(event) => draft.setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        className="min-h-[16rem] flex-1 resize-none rounded-xl border border-line bg-panel p-4 font-mono text-[12.5px] leading-relaxed text-ink shadow-raise outline-none transition-colors duration-fast ease focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus-visible:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={!draft.dirty || saving} className={SAVE}>{saving ? 'Saving...' : 'Save'}</button>
        {draft.dirty && (
          <button type="button" onClick={draft.discard} className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors duration-fast ease hover:border-edge hover:text-ink">
            Discard edits
          </button>
        )}
        <span aria-live="polite" className="text-xs text-muted">{note}</span>
      </div>
    </div>
  );
}
