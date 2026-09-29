// The toolbar's secondary buttons share one look: a quiet pill with an
// icon, so the one saffron thing on the screen stays what acts (the chat's
// Apply, the source's Save).
export const TOOL = 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink '
  + 'transition-colors duration-fast ease hover:border-edge disabled:cursor-not-allowed disabled:opacity-50';

export default function DocumentToolButton({ label, onClick, disabled = false, children }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={TOOL}>
      {children}
    </button>
  );
}
