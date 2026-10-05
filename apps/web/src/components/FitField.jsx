// One field of Best fit: its name, a line on what the ranking does with it,
// then the control. The line is the point of the section: these are the
// only things the recommendations are ranked by, and a name alone left
// people guessing what "Locations" or a degree would change. `htmlFor` ties
// the name to a single control; a row of choices names itself as a group.
export default function FitField({ label, caption, htmlFor, children }) {
  const name = 'text-sm font-semibold text-ink';
  return (
    <div className="flex flex-col gap-1" role={htmlFor ? undefined : 'group'} aria-label={htmlFor ? undefined : label}>
      {htmlFor ? <label htmlFor={htmlFor} className={name}>{label}</label> : <span className={name}>{label}</span>}
      <p className="mb-1 text-xs text-muted">{caption}</p>
      {children}
    </div>
  );
}
