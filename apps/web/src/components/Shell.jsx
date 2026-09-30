import { useEffect, useRef, useState } from 'react';
import { useSavedFilters } from '../lib/useSavedFilters.js';
import { useChatDock } from '../lib/useChatDock.js';
import { useGlobalKeys } from '../lib/useGlobalKeys.js';
import { useViewMode } from '../lib/viewMode.js';
import Topbar from './Topbar.jsx';
import CommandPalette from './CommandPalette.jsx';
import ShortcutsHelp from './ShortcutsHelp.jsx';
import AiChatPanel from './AiChatPanel.jsx';
import ToastHost from './ToastHost.jsx';
import ShellMain from './ShellMain.jsx';
import { OVERLAY_HOST_ID } from '../lib/overlayHost.js';
import { WIDE_QUERY } from '../lib/chatLayout.js';

// Full-viewport app frame: the topbar and the scrolling page under it. The
// feed's filters live in the feed's own column (see FeedTop.jsx), so they
// line up with the rows and move with them when the chat is pinned; their
// state stays here, where the chat and the command palette change it too.
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
  // The chat is where every AI action happens, on every page; the job pane
  // asks it to open on a posting (see useChatDock.js), so its state lives
  // here beside both.
  const chat = useChatDock();
  const searchRef = useRef(null);
  const postings = view === 'postings';

  // The Resume page is built around the chat: every change to a document is
  // asked for there, so arriving opens it, docked beside the documents (see
  // useChatLayout.js). Closing it there holds until the next arrival. Not on
  // a narrow window, where the chat would cover the documents entirely.
  useEffect(() => {
    if (view === 'resume' && globalThis.matchMedia?.(WIDE_QUERY)?.matches) chat.show();
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // The chrome's three global shortcuts. j/k/Enter/s/a/d/u belong to the feed
  // and are bound in its own hook, not here.
  useGlobalKeys({
    onOpenPalette: () => setPaletteOpen(true),
    onOpenHelp: () => setHelpOpen(true),
    onFocusSearch: postings ? () => searchRef.current?.focus() : undefined,
  });

  return (
    <div className="app-canvas flex h-full w-full flex-col">
      <Topbar
        view={view}
        setView={setView}
        q={filters.q}
        onSearch={postings ? (value) => setFilters({ ...filters, q: value }) : null}
        searchRef={searchRef}
        chatOpen={chat.open}
        onToggleChat={chat.toggle}
      />
      {/* The chat is on every page and the page area is its row: floating, it
          sits over the page; pinned, the page makes room beside it. */}
      <div id={OVERLAY_HOST_ID} className="relative flex min-h-0 flex-1">
        <AiChatPanel
          open={chat.open}
          onClose={chat.close}
          request={chat.request}
          draft={chat.draft}
          context={{ filters, sort, page: view }}
          apply={{ setFilters, setSort, setView }}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <ShellMain view={view} setView={setView} feed={{ filters, setFilters, sort, setSort, viewMode, setViewMode }} />
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
