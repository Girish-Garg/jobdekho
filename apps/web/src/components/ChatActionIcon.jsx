import { DocumentIcon, PenIcon, ShieldCheckIcon } from './Icon.jsx';

const ICONS = { 'fake-check': ShieldCheckIcon, 'cover-letter': PenIcon, 'resume-tailor': DocumentIcon };

// One picture per posting action, shared by its quick action button and its
// answer card, so the two are recognisably the same thing.
export default function ChatActionIcon({ kind, ...props }) {
  const Icon = ICONS[kind];
  return Icon ? <Icon {...props} /> : null;
}
