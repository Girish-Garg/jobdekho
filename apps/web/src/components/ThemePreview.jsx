// A thumbnail of JobDekho in one theme: the top bar, a filter pill and three
// rows, drawn with the theme's own tokens by setting data-theme on the
// thumbnail itself (see index.css), so it shows that theme whichever one is
// on around it. "Follow my system" is the two halves side by side.
export default function ThemePreview({ theme }) {
  if (theme === 'system') {
    return (
      <div aria-hidden="true" className="grid h-24 grid-cols-2 overflow-hidden rounded-xl border border-line">
        <Scene theme="light" />
        <Scene theme="dark" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="h-24 overflow-hidden rounded-xl border border-line">
      <Scene theme={theme} />
    </div>
  );
}

function Scene({ theme }) {
  return (
    <div data-theme={theme} className="flex h-full flex-col bg-paper">
      <div className="flex h-4 shrink-0 items-center gap-1 border-b border-line bg-panel px-2">
        <span className="h-1.5 w-5 rounded-full bg-primary" />
        <span className="h-1 w-3 rounded-full bg-muted/40" />
        <span className="h-1 w-3 rounded-full bg-muted/40" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <span className="h-1.5 w-8 rounded-full border border-primary/40 bg-primary/15" />
        {[0.8, 0.6, 0.7].map((width) => (
          <div key={width} className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-1.5 py-1">
            <span className="h-2 w-2 shrink-0 rounded-sm bg-primary/30" />
            <span className="h-1 rounded-full bg-ink/60" style={{ width: `${width * 50}%` }} />
            <span className="ml-auto h-1 w-3 rounded-full bg-primary" />
          </div>
        ))}
      </div>
    </div>
  );
}
