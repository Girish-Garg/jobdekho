import Shell from './components/Shell.jsx';

// No login screen, no session to wait on: JobDekho is a single-user tool
// that opens straight into the feed.
export default function App() {
  return <Shell />;
}
