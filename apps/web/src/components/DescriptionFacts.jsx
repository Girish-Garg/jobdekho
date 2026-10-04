import { factItems } from '../lib/descriptionView.js';
import { BriefcaseIcon, WalletIcon, MapPinIcon } from './Icon.jsx';
import TagChip from './TagChip.jsx';

const ICON = { years: BriefcaseIcon, pay: WalletIcon, mode: MapPinIcon };

// The line above the description: what its text states about the years it
// asks for, the pay and the work mode, each saying on hover and focus the
// words it was read from. Read from the server's `facts`, which reads years
// the way the fit does, so this line and the fit never disagree.
export default function DescriptionFacts({ facts }) {
  const items = factItems(facts);
  if (!items.length) return null;

  return (
    <ul aria-label="What the posting states" className="mb-3 flex flex-wrap gap-1.5">
      {items.map(({ key, name, value, evidence }) => {
        const Icon = ICON[key];
        return (
          <li key={key} className="flex">
            <TagChip tone="quiet" evidence={evidence} className="gap-1.5 px-2.5 py-1 font-medium text-ink/85">
              <Icon size={12} className="text-muted" />
              <span className="sr-only">{name}: </span>
              {value}
            </TagChip>
          </li>
        );
      })}
    </ul>
  );
}
