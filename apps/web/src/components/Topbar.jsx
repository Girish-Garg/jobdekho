// Slim top strip: wordmark, section nav, keyword search, current user, sign-out.
import { logout } from '../api.js';
import ThemeToggle from './ThemeToggle.jsx';

export default function Topbar({ user, view, setView, onLogout, q = '', onSearch }) {
  const name = user?.name || user?.email || 'Account';
  const initial = name.slice(0, 1).toUpperCase();

  async function handleLogout() {
    await logout();
    onLogout?.();
  }

  // Never wraps: the two end groups keep their size and the search takes what
  // is left, down to nothing on a phone.
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-panel px-5">
      <div className="flex shrink-0 items-center gap-6">
        <span className="hidden font-display text-lg font-extrabold tracking-tight sm:inline">JobDekho</span>
        <nav className="flex items-center gap-1">
          <NavItem active={view === 'postings'} onClick={() => setView?.('postings')}>Postings</NavItem>
          <NavItem active={view === 'profile'} onClick={() => setView?.('profile')}>Profile</NavItem>
          <NavItem active={view === 'settings'} onClick={() => setView?.('settings')}>Settings</NavItem>
        </nav>
      </div>

      {onSearch && (
        <div className="flex min-w-0 flex-1 justify-center">
          <input
            value={q}
            onChange={(event) => onSearch(event.target.value)}
            aria-label="Keyword"
            placeholder="Search titles and companies"
            className="w-full max-w-lg rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none transition focus:border-ink"
          />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-sm text-muted lg:inline">{name}</span>
        {/* Both drop out on a phone so the width goes to the search instead. */}
        <span className="hidden h-8 w-8 place-items-center rounded-full bg-ink font-mono text-xs text-paper sm:grid">
          {initial}
        </span>
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-ink hover:text-ink"
        >
          Log out
        </button>
      </div>
    </header>
  );
}

function NavItem({ active, onClick, children }) {
  const cls = `rounded-full px-2.5 py-1.5 text-sm font-medium transition sm:px-3.5 ${
    active ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
  }`;
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={cls}>
      {children}
    </button>
  );
}
