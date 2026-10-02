// How many there are, beside a name: a section's entries, a company's jobs.
// solid is the saffron one on a filter trigger. The badge only shows the
// number, so whatever it sits beside has to say it in words to a screen
// reader (the trigger's own name carries "Level (2)").
export default function CountBadge({ n, solid = false, className = '', ...props }) {
  return (
    <span className={`count${solid ? ' count-solid' : ''} ${className}`.trim()} {...props}>
      {n}
    </span>
  );
}
