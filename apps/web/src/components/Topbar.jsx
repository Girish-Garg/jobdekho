// Slim top strip: wordmark, current user, sign-out.
export default function Topbar({ user }) {
  const name = user?.name || user?.email || 'Account';
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <header className="flex h-full items-center justify-between border-b border-line bg-panel px-5">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg font-extrabold tracking-tight">JobDekho</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">board</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted sm:inline">{name}</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-mono text-xs text-paper">
          {initial}
        </span>
        <form action="/auth/logout" method="post">
          <button className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-ink hover:text-ink">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
