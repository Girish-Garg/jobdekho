// Slim top strip: wordmark, section nav, keyword search, theme toggle.
import { useState } from 'react';
import ThemeToggle from './ThemeToggle.jsx';
import SlidingPill from './SlidingPill.jsx';
import { useSlidingPill } from '../lib/useSlidingPill.js';
import AskAiToggle from './AskAiToggle.jsx';
import { SearchIcon } from './Icon.jsx';

export default function Topbar({ view, setView, q = '', onSearch, searchRef, chatOpen, onToggleChat }) {
  // Drives the "/" hint: it is only useful before anyone has found the box,
  // so it drops out the moment there is a reason it would be in the way.
  const [searchFocused, setSearchFocused] = useState(false);
  const pill = useSlidingPill(view);

  // Never wraps: the two end groups keep their size and the search takes what
  // is left, down to nothing on a phone. A compact 48px row is the budget the
  // rest of the chrome is built to, so nothing here grows past it.
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-panel px-5">
      <div className="flex shrink-0 items-center gap-6">
        <span className="hidden font-display text-lg font-extrabold tracking-tight text-ink sm:inline">Job<span className="text-primary">Dekho</span></span>
        <nav ref={pill.ref} className="relative flex items-center gap-1">
          <SlidingPill style={pill.style} glides={pill.glides} />
          <NavItem value="postings" active={view === 'postings'} onClick={() => setView?.('postings')}>Postings</NavItem>
          <NavItem value="profile" active={view === 'profile'} onClick={() => setView?.('profile')}>Profile</NavItem>
          <NavItem value="resume" active={view === 'resume'} onClick={() => setView?.('resume')}>Resume</NavItem>
          <NavItem value="settings" active={view === 'settings'} onClick={() => setView?.('settings')}>Settings</NavItem>
        </nav>
      </div>

      {onSearch && (
        <div className="flex min-w-0 flex-1 justify-end">
          <div className="relative w-full max-w-[320px]">
            <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={q}
              onChange={(event) => onSearch(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
              aria-label="Keyword"
              placeholder="Search titles and companies"
              className="w-full rounded-full border border-line bg-paper py-1.5 pl-9 pr-9 text-sm outline-none transition-colors duration-fast ease hover:border-edge focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
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
        {onToggleChat && (
          <AskAiToggle open={chatOpen} onToggle={onToggleChat} />
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

// The active item's background is the sliding pill behind the row, so an
// item only brings its text; it sits above the pill.
function NavItem({ value, active, onClick, children }) {
  const cls = `relative rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors duration-fast ease sm:px-3.5 ${
    active ? 'text-ink' : 'text-muted hover:text-ink'
  }`;
  return (
    <button type="button" data-pill-key={value} onClick={onClick} aria-current={active ? 'page' : undefined} className={cls}>
      {children}
    </button>
  );
}
