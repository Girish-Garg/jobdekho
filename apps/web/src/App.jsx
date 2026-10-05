import Shell from './components/Shell.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import BrokenScreen from './components/BrokenScreen.jsx';

// No login screen, no session to wait on: JobDekho is a single-user tool
// that opens straight into the feed. The last line of defence: whatever no
// part below caught (the top bar, the frame itself) leaves a screen with a
// way out, not a blank page.
export default function App() {
  return (
    <ErrorBoundary
      where="the app"
      fallback={({ error, report }) => (
        <BrokenScreen
          full
          title="JobDekho could not show this screen"
          body="Something broke while drawing it. Nothing you saved is lost, and reloading usually puts it right."
          error={error}
          report={report}
        />
      )}
    >
      <Shell />
    </ErrorBoundary>
  );
}
