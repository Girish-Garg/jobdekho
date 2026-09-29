// A company's first letter on a saffron tile: jobs named in the chat get a
// shape to scan by without the app fetching anyone's logo from the web.
export default function ChatMonogram({ name, size = 'md' }) {
  const letter = String(name ?? '').match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? '';
  const box = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-lg bg-primary/10 font-display font-bold text-primary ${box}`}>
      {letter}
    </span>
  );
}
