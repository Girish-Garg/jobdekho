// A name that starts with what was typed comes first, then one with a word
// that does, then any other match: "ola" finds Ola before Motorola. The sort
// is stable, so each group keeps the most-jobs-first order it came in.
export function rankCompanies(rows, needle) {
  if (!needle) return rows;
  const place = (name) => (name.startsWith(needle) ? 0 : name.includes(` ${needle}`) ? 1 : 2);
  return rows
    .map((row) => ({ row, name: row.name.toLowerCase() }))
    .filter(({ name }) => name.includes(needle))
    .sort((a, b) => place(a.name) - place(b.name))
    .map(({ row }) => row);
}
