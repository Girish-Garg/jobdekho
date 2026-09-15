import TagInput from './TagInput.jsx';

const FIELDS = [
  ['includeKeywords', 'Include keywords'],
  ['excludeKeywords', 'Exclude keywords'],
  ['locations', 'Locations'],
];

// Collapsed by default: three keyword lists get long and are rarely edited
// once set, so the count in the summary is what proves nothing is hidden.
export default function AlertKeywords({ filters, setFilter }) {
  const total = FIELDS.reduce((n, [key]) => n + (filters[key]?.length ?? 0), 0);

  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium text-ink">
        {total} keyword{total === 1 ? '' : 's'} set
      </summary>
      <div className="mt-4 flex flex-col gap-5">
        {FIELDS.map(([key, label]) => (
          <TagInput key={key} label={label} values={filters[key]} onChange={setFilter(key)} />
        ))}
      </div>
    </details>
  );
}
