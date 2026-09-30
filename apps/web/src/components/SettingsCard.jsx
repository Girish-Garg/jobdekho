// One group of settings: an icon chip, the title and what it controls, an
// optional note on the right (the AI CLI's "Saved"), and the controls below.
// A card per group, stacked at one width, so a group added later lines up
// with the rest without a layout of its own. It eases in as it arrives, and a
// soft light follows the pointer across it (see motion.css and dither.css).
export default function SettingsCard({ icon, title, hint, note = null, children }) {
  return (
    <section data-reveal aria-label={title} className="dither-spot dither-soft rounded-2xl border border-line bg-panel p-5 shadow-raise hover:border-edge sm:p-6">
      <div className="mb-5 flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-ink">{title}</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">{hint}</p>
        </div>
        {note}
      </div>
      {children}
    </section>
  );
}
