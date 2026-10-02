import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';

// Shown instead of the record when the saved profile could not be read, so
// there is nothing blank on screen to save over the real one (see
// useProfileLoad.js). The likeliest cause is the server having stopped.
export default function ProfileLoadFailed({ onRetry }) {
  return (
    <Card role="alert" className="mt-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 py-4">
      <p className="text-sm text-muted">
        Your saved profile could not be read, so there is nothing to edit yet. Is JobDekho still running?
      </p>
      <Button size="sm" onClick={onRetry} className="py-1.5">
        Try again
      </Button>
    </Card>
  );
}
