// Shown in place of the fill-in button when no AI CLI can answer. A button
// that can only fail teaches nothing; the install link and a re-check are the
// two things that get the person unstuck. An installed CLI that will not run
// carries the server's sentence about why, which goes up verbatim.
export default function InstallHint({ providers, checking, onRecheck }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <p className="text-sm text-ink">
        Filling in from the resume asks an AI CLI installed on this computer, on your own subscription.
      </p>
      {providers.length === 0 && (
        <p role="alert" className="text-sm text-ember">
          Could not check which AI CLIs are installed. Check again once the server is back.
        </p>
      )}
      {providers.map((p) => (
        <p key={p.id} className="text-sm text-ink">
          {p.present ? (
            p.error
          ) : (
            <>
              Install {p.label} from{' '}
              <a href={p.install} target="_blank" rel="noreferrer" className="underline">{p.install}</a>,
              then check again. If it is still not found, restart JobDekho so it picks up the new PATH.
            </>
          )}
        </p>
      ))}
      <div>
        <button
          type="button"
          disabled={checking}
          onClick={onRecheck}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60"
        >
          {checking ? 'Checking...' : 'Check again'}
        </button>
      </div>
    </div>
  );
}
