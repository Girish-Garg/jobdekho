const STATUSES = [
  ['', 'All'],
  ['new', 'New'],
  ['saved', 'Saved'],
  ['applied', 'Applied'],
  ['dismissed', 'Dismissed'],
];

// Left rail: section nav + the live posting filters.
export default function Sidebar({ view, setView, filters, setFilters }) {
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <nav className="flex flex-col gap-7 p-5">
      <div className="flex flex-col gap-1">
        <NavItem active={view === 'postings'} onClick={() => setView('postings')}>Postings</NavItem>
        <NavItem active={view === 'settings'} onClick={() => setView('settings')}>Settings</NavItem>
      </div>

      <div className={view === 'postings' ? 'flex flex-col gap-5' : 'hidden'}>
        <Field label="Keyword">
          <input
            value={filters.q}
            onChange={set('q')}
            placeholder="frontend, data, intern"
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </Field>
        <Field label="Source">
          <input
            value={filters.source}
            onChange={set('source')}
            placeholder="any source"
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </Field>
        <Field label="Status">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilters({ ...filters, status: v })}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  filters.status === v
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line text-muted hover:border-ink hover:text-ink'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Min stipend">
          <select
            value={filters.minStipend}
            onChange={set('minStipend')}
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="">Any</option>
            <option value="1">Paid only</option>
            <option value="5000">Rs 5,000+</option>
            <option value="10000">Rs 10,000+</option>
            <option value="15000">Rs 15,000+</option>
          </select>
        </Field>
        <Field label="Max duration">
          <select
            value={filters.maxMonths}
            onChange={set('maxMonths')}
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="">Any</option>
            <option value="1">1 month</option>
            <option value="2">2 months</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
          </select>
        </Field>
      </div>
    </nav>
  );
}

function NavItem({ active, onClick, children }) {
  const cls = `rounded-md px-3 py-2 text-left text-sm font-medium transition ${active ? 'bg-ink text-paper' : 'text-muted hover:bg-paper hover:text-ink'}`
  return <button onClick={onClick} className={cls}>{children}</button>
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{label}</span>
      {children}
    </label>
  )
}
