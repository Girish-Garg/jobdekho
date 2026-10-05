import Card from './ui/Card.jsx';
import CountBadge from './ui/CountBadge.jsx';

// One group of settings: an icon chip (neutral, like the Profile's; saffron
// is kept for what you act with), the title and what it controls, an
// optional note on the right (the AI CLI's "Saved"), an optional count
// beside the title (how many companies are blocked), and the controls below.
// A card per group, stacked at one width, so a group added later lines up
// with the rest without a layout of its own. It eases in as it arrives, and a
// soft light follows the pointer across it (see motion.css and dither.css).
export default function SettingsCard({ icon, title, hint, note = null, count = null, children }) {
  return (
    <Card as="section" variant="panel" data-reveal aria-label={title} className="dither-spot dither-soft shadow-raise hover:border-edge sm:p-6">
      <div className="mb-5 flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-select text-ink ring-1 ring-inset ring-line">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-ink">{title}</h3>
            {count != null && <CountBadge n={count} />}
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted">{hint}</p>
        </div>
        {note}
      </div>
      {children}
    </Card>
  );
}
