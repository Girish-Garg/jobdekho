import PostingsView from './PostingsView.jsx';
import ProfileView from './ProfileView.jsx';
import ResumeWorkspace from './ResumeWorkspace.jsx';
import SettingsView from './SettingsView.jsx';

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

function surface(view, setView, feed) {
  if (view === 'postings') return <PostingsView {...feed} onOpenProfile={() => setView('profile')} onOpenSettings={() => setView('settings')} />;
  if (view === 'profile') return <ProfileView />;
  if (view === 'resume') return <ResumeWorkspace />;
  return <SettingsView />;
}
