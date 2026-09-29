import { useRef, useState } from 'react';
import { useSavedFilters } from '../lib/useSavedFilters.js';
import { useChatDock } from '../lib/useChatDock.js';
import { useGlobalKeys } from '../lib/useGlobalKeys.js';
import { useViewMode } from '../lib/viewMode.js';
import FilterBar from './FilterBar.jsx';
import SortSelect from './SortSelect.jsx';
import DensityToggle from './DensityToggle.jsx';
import Topbar from './Topbar.jsx';
import CommandPalette from './CommandPalette.jsx';
import ShortcutsHelp from './ShortcutsHelp.jsx';
import AiChatPanel from './AiChatPanel.jsx';
import ToastHost from './ToastHost.jsx';
import ShellMain from './ShellMain.jsx';
import { OVERLAY_HOST_ID } from '../lib/overlayHost.js';

// Full-viewport app frame: topbar, filter bar, scrolling main region. The
// filters sit above the feed rather than beside it so the grid gets the width.
export default function Shell() {
  const [view, setView] = useState('postings');
  const [filters, setFilters] = useSavedFilters();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // The feed reads these; the filter row and the command palette set them.
  // Held here so the controls can sit in the chrome without a bridge to the
  // feed's own state.
  const [sort, setSort] = useState('match');
  const [viewMode, setViewMode] = useViewMode();
  // The chat is where every AI action happens; the job pane asks it to open
  // on a posting (see useChatDock.js), so its state lives here beside both.
  const chat = useChatDock();
  const searchRef = useRef(null);
  const postings = view === 'postings';

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
        view={view}
        setView={setView}
        q={filters.q}
        onSearch={postings ? (value) => setFilters({ ...filters, q: value }) : null}
        searchRef={searchRef}
        chatOpen={chat.open}
        onToggleChat={postings ? chat.toggle : null}
      />
      {postings && (
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          trailing={(
            <>
              <DensityToggle mode={viewMode} setMode={setViewMode} />
              <SortSelect sort={sort} setSort={setSort} />
            </>
          )}
        />
      )}
      <div id={OVERLAY_HOST_ID} className="relative flex min-h-0 flex-1">
        {postings && <AiChatPanel
            open={chat.open}
            onClose={chat.close}
            request={chat.request}
            context={{ filters, sort }}
            apply={{ setFilters, setSort }}
          />}
        <main className="min-h-0 flex-1 overflow-y-auto">
        <ShellMain view={view} filters={filters} sort={sort} viewMode={viewMode} setView={setView} />
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        view={view}
        setView={setView}
        filters={filters}
        setFilters={setFilters}
        setSort={setSort}
        onOpenHelp={() => setHelpOpen(true)}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ToastHost />
    </div>
  );
}
