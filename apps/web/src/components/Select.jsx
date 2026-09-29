import { ChevronDownIcon } from './Icon.jsx';

// A native <select> keeps the keyboard, the screen reader and a phone's own
// picker, so only its arrow is swapped. The browser draws its own, which sat
// beside the filter triggers' chevrons and matched none of them.
export default function Select({ className = '', block = false, children, ...props }) {
  return (
    <span className={`relative ${block ? 'flex' : 'inline-flex'}`}>
      <select {...props} className={`w-full appearance-none pr-7 ${className}`}>
        {children}
      </select>
      <ChevronDownIcon size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
    </span>
  );
}
