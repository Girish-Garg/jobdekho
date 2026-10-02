import Button from './ui/Button.jsx';

// The toolbar's secondary buttons share one look: a quiet pill with an
// icon, so the one saffron thing on the screen stays what acts (the chat's
// Apply, the source's Save).
export default function DocumentToolButton({ label, onClick, disabled = false, children }) {
  return (
    <Button variant="quiet" size="sm" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="shrink-0 px-3 py-1.5 disabled:cursor-not-allowed">
      {children}
    </Button>
  );
}
