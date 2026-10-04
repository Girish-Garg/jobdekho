import { lazy, Suspense } from 'react';
import PostingsView from './PostingsView.jsx';
import ProfileView from './ProfileView.jsx';
import SettingsView from './SettingsView.jsx';

// The Resume workspace, with its documents, versions and PDF preview, is the
// heaviest page and never the first screen, so it is fetched the first time
// it is opened rather than with the app: bundled in, it took the app's one
// script past the size the build warns at.
const ResumeWorkspace = lazy(() => import('./ResumeWorkspace.jsx'));

// Which of the four surfaces the nav is pointing at. Split out of Shell so
// that file stays about the frame: the chrome, the panels either side of it,
// and the state those share. A page eases in as it replaces the last one,
// keyed by the view so it plays once per switch and never on a re-render.
// The Resume page is a workspace that fills the window, so its wrapper takes
// the full height; the others scroll, and a fixed height there would cut the
// feed's sticky filter bar loose after one screen.
export default function ShellMain({ view, setView, feed }) {
  return <div key={view} className={view === 'resume' ? 'rise h-full' : 'rise'}>{surface(view, setView, feed)}</div>;
}

// While the workspace's code is on its way, the line it shows while its
// documents load, so the wait reads as one.
function surface(view, setView, feed) {
  if (view === 'postings') return <PostingsView {...feed} onOpenProfile={() => setView('profile')} onOpenSettings={() => setView('settings')} />;
  if (view === 'profile') return <ProfileView />;
  if (view === 'resume') {
    return (
      <Suspense fallback={<p className="p-8 text-sm text-muted">Loading your documents...</p>}>
        <ResumeWorkspace />
      </Suspense>
    );
  }
  return <SettingsView />;
}
