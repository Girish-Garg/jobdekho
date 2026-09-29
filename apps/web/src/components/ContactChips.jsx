import { MailIcon, PhoneIcon, MapPinIcon, LinkIcon } from './Icon.jsx';

const CHIP = 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-paper/60 px-2.5 py-1 text-xs text-ink';

// A link shows as its site and path, not its scheme, which is noise here.
const short = (url) => String(url).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

// How to reach the person, as the resume header will print it: only what is
// filled in, so an empty record shows nothing rather than a row of blanks.
export default function ContactChips({ basics }) {
  const links = Object.values(basics.links ?? {}).filter(Boolean);
  const items = [
    basics.email && [MailIcon, basics.email],
    basics.phone && [PhoneIcon, basics.phone],
    basics.location && [MapPinIcon, basics.location],
    ...links.map((link) => [LinkIcon, short(link)]),
  ].filter(Boolean);
  if (!items.length) return null;

  return (
    <ul aria-label="Contact" className="mt-3 flex flex-wrap gap-1.5">
      {items.map(([Icon, text]) => (
        <li key={text} className={CHIP}>
          <Icon size={12} className="text-muted" />
          <span className="truncate">{text}</span>
        </li>
      ))}
    </ul>
  );
}
