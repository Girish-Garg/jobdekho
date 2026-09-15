import { useEffect, useRef, useState } from 'react';
import { getFilters } from '../api.js';
import { EMPTY_FILTERS, toFilterState } from '../lib/savedFilters.js';
import { useGlobalKeys } from '../lib/useGlobalKeys.js';
import FilterBar from './FilterBar.jsx';
import Topbar from './Topbar.jsx';
import PostingsView from './PostingsView.jsx';
import ProfileView from './ProfileView.jsx';
import SettingsView from './SettingsView.jsx';
import CommandPalette from './CommandPalette.jsx';
import ShortcutsHelp from './ShortcutsHelp.jsx';

// Full-viewport app frame: topbar, filter bar, scrolling main region. The
// filters sit above the feed rather than beside it so the grid gets the width.
export default function Shell({ user, onLogout }) {
  const [view, setView] = useState('postings');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef(null);
  const postings = view === 'postings';

  // The saved filter is what the user should see on sign-in; if it cannot be
  // read we stay on the empty defaults rather than blocking the feed.
  useEffect(() => {
    let alive = true;
    getFilters()
      .then((saved) => alive && setFilters({ ...EMPTY_FILTERS, ...toFilterState(saved) }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // The chrome's three global shortcuts. j/k/Enter/s/a/d/u belong to the feed
  // and are bound in its own hook, not here.
  useGlobalKeys({
    onOpenPalette: () => setPaletteOpen(true),
    onOpenHelp: () => setHelpOpen(true),
    onFocusSearch: postings ? () => searchRef.current?.focus() : undefined,
  });

  return (
    <div className="flex h-full w-full flex-col bg-paper">
      <Topbar
        user={user}
        view={view}
        setView={setView}
        onLogout={onLogout}
        q={filters.q}
        onSearch={postings ? (value) => setFilters({ ...filters, q: value }) : null}
        searchRef={searchRef}
      />
      {postings && <FilterBar filters={filters} setFilters={setFilters} />}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {postings ? (
          <PostingsView filters={filters} onOpenProfile={() => setView('profile')} />
        ) : view === 'profile' ? (
          <ProfileView />
        ) : (
          <SettingsView />
        )}
      </main>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        view={view}
        setView={setView}
        filters={filters}
        setFilters={setFilters}
        onOpenHelp={() => setHelpOpen(true)}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
