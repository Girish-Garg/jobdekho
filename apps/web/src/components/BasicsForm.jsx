const BOX = 'rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-ink';

function Text({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <input className={BOX} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

// Name, contact and links: the header a resume builder puts at the top of
// every document, kept apart from the ranking fields below because none of
// this feeds Best fit.
export default function BasicsForm({ basics, onChange }) {
  const set = (key) => (value) => onChange({ ...basics, [key]: value });
  const setLink = (key) => (value) => onChange({ ...basics, links: { ...basics.links, [key]: value } });

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-md font-semibold text-ink">Basics</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Text label="Name" value={basics.name} onChange={set('name')} />
        <Text label="Headline" value={basics.headline} onChange={set('headline')} placeholder="e.g. Backend engineer" />
        <Text label="Email" value={basics.email} onChange={set('email')} />
        <Text label="Phone" value={basics.phone} onChange={set('phone')} />
        <Text label="Location" value={basics.location} onChange={set('location')} />
        <Text label="GitHub" value={basics.links.github} onChange={setLink('github')} />
        <Text label="LinkedIn" value={basics.links.linkedin} onChange={setLink('linkedin')} />
        <Text label="Portfolio" value={basics.links.portfolio} onChange={setLink('portfolio')} />
      </div>
    </section>
  );
}
