import { forwardRef } from 'react';
import { SearchIcon } from '../Icon.jsx';

// The search box in a menu or a bar: the glass at its left, and label as
// its accessible name, since a placeholder vanishes the moment anyone types
// and is not a name at all. className sizes the wrapper in its row;
// inputClassName reaches the box itself. The look lives in fields.css.
const SearchField = forwardRef(function SearchField({ label, className = '', inputClassName = '', ...props }, ref) {
  return (
    <span className={`relative min-w-0 flex-1 ${className}`.trim()}>
      <SearchIcon size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input ref={ref} aria-label={label} className={`field-search ${inputClassName}`.trim()} {...props} />
    </span>
  );
});

export default SearchField;
