// The heading over one part of the tailoring review (the fit list, the
// skills, a section of entries), with a quiet word beside it on how that
// part stands: "2 pages, about 6 lines over", "3 left out".
export default function TailorHead({ title, note }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <h3 className="font-display text-base font-bold tracking-tight text-ink">{title}</h3>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}
