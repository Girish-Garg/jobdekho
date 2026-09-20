// Slim top strip: wordmark, section nav, keyword search, theme toggle.
import { useState } from 'react';
import ThemeToggle from './ThemeToggle.jsx';

export default function Topbar({ view, setView, q = '', onSearch, searchRef }) {
  // Drives the "/" hint: it is only useful before anyone has found the box,
  // so it drops out the moment there is a reason it would be in the way.
  const [searchFocused, setSearchFocused] = useState(false);

  // Never wraps: the two end groups keep their size and the search takes what
  // is left, down to nothing on a phone. A compact 48px row is the budget the
  // rest of the chrome is built to, so nothing here grows past it.
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-panel px-5">
      <div className="flex shrink-0 items-center gap-6">
        <span className="hidden font-display text-lg font-extrabold tracking-tight sm:inline">JobDekho</span>
        <nav className="flex items-center gap-1">
          <NavItem active={view === 'postings'} onClick={() => setView?.('postings')}>Postings</NavItem>
          <NavItem active={view === 'profile'} onClick={() => setView?.('profile')}>Profile</NavItem>
          <NavItem active={view === 'resume'} onClick={() => setView?.('resume')}>Resume</NavItem>
          <NavItem active={view === 'settings'} onClick={() => setView?.('settings')}>Settings</NavItem>
        </nav>
      </div>

      {onSearch && (
        <div className="flex min-w-0 flex-1 justify-end">
          <div className="relative w-full max-w-[300px]">
            <input
              ref={searchRef}
              value={q}
              onChange={(event) => onSearch(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
              aria-label="Keyword"
              placeholder="Search titles and companies"
              className="w-full rounded-md border border-line bg-paper px-3 py-1 text-sm outline-none transition-colors duration-fast ease focus:border-edge"
            />
            {!searchFocused && !q && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted"
              >
                /
              </span>
            )}
          </div>
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}

function NavItem({ active, onClick, children }) {
  const cls = `rounded-full px-2.5 py-1 text-sm font-medium transition sm:px-3.5 ${
    active ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
  }`;
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={cls}>
      {children}
    </button>
  );
}
