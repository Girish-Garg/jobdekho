// The server's sentence for a failed AI call, verbatim: each one says what to
// do. A CLI that went missing is the one failure with a button worth
// offering, the re-probe, because the sentence for it ends in "restart" and
// a person who just fixed the PATH wants to check without reloading.
export default function AiError({ error, checking, onRecheck }) {
  if (!error) return null;

  return (
    <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-ember">
      {error.message}
      {error.kind === 'not_found' && (
        <button type="button" disabled={checking} onClick={onRecheck} className="link">
          {checking ? 'Checking...' : 'Check again'}
        </button>
      )}
    </p>
  );
}
