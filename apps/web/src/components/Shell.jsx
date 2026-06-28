import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import PostingsView from './PostingsView.jsx';
import SettingsView from './SettingsView.jsx';

const EMPTY = { source: '', q: '', status: '' };

// Full-viewport app frame: fixed sidebar + topbar, scrolling main region.
export default function Shell({ user, onLogout }) {
  const [view, setView] = useState('postings');
  const [filters, setFilters] = useState(EMPTY);

  return (
    <div className="grid h-full w-full grid-cols-[260px_1fr] grid-rows-[56px_1fr] bg-paper">
      <div className="col-span-2 row-start-1">
        <Topbar user={user} onLogout={onLogout} />
      </div>
      <aside className="col-start-1 row-start-2 overflow-y-auto border-r border-line bg-panel">
        <Sidebar view={view} setView={setView} filters={filters} setFilters={setFilters} />
      </aside>
      <main className="col-start-2 row-start-2 overflow-y-auto">
        {view === 'postings' ? (
          <PostingsView filters={filters} />
        ) : (
          <SettingsView />
        )}
      </main>
    </div>
  );
}
