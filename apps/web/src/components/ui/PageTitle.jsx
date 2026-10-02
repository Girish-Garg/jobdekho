// The one big heading at the top of a page (Postings, Profile, Settings),
// so every page opens on the same type. It is the page's h1; className sizes
// it down where a page opens on something else first.
export default function PageTitle({ className = '', ...props }) {
  return <h1 className={`page-title ${className}`.trim()} {...props} />;
}
