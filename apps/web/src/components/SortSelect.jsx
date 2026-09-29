import Select from './Select.jsx';

// Best fit leads because it is the default. Each option is named for the
// axis it orders by: "Recommended" once claimed the whole feed, and now that
// fit is also a filter the sort is just one dimension of it.
const SORTS = [
  ['match', 'Best fit'],
  ['newest', 'Newest posted'],
  ['oldest', 'Oldest posted'],
  ['added', 'Recently added'],
  ['company', 'Company A-Z'],
];

export default function SortSelect({ sort, setSort }) {
  return (
    <Select
      aria-label="Sort"
      value={sort}
      onChange={(event) => setSort(event.target.value)}
      className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink outline-none transition-colors duration-fast ease focus:border-edge"
    >
      {SORTS.map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </Select>
  );
}
