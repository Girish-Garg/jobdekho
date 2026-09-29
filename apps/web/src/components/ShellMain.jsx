import PostingsView from './PostingsView.jsx';
import ProfileView from './ProfileView.jsx';
import ResumeWorkspace from './ResumeWorkspace.jsx';
import SettingsView from './SettingsView.jsx';

// Which of the four surfaces the nav is pointing at. Split out of Shell so
// that file stays about the frame: the chrome, the panels either side of it,
// and the state those share.
export default function ShellMain({ view, setView, feed }) {
  if (view === 'postings') return <PostingsView {...feed} onOpenProfile={() => setView('profile')} />;
  if (view === 'profile') return <ProfileView />;
  if (view === 'resume') return <ResumeWorkspace />;
  return <SettingsView />;
}
