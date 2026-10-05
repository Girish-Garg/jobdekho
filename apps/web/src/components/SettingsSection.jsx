import ErrorBoundary from './ErrorBoundary.jsx';
import BrokenSection from './BrokenSection.jsx';

// One section of the Settings page, where the index beside it jumps to. Each
// card stands alone, so one that cannot be drawn says so under its own name
// and the others go on working (see BrokenSection.jsx).
export default function SettingsSection({ id, label, children }) {
  return (
    <div id={id} className="scroll-mt-4">
      <ErrorBoundary
        where={`the Settings card ${label}`}
        fallback={({ report, retry }) => <BrokenSection title={label} report={report} retry={retry} />}
      >
        {children}
      </ErrorBoundary>
    </div>
  );
}
