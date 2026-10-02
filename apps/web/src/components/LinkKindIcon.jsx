import {
  CodeIcon, GlobeIcon, PlayIcon, FigmaIcon, PaletteIcon, DriveIcon, DatasetIcon, ImageIcon, DocumentIcon, LinkIcon,
} from './Icon.jsx';

// Each kind of link's icon, the same on its chip, its row, its quick-add
// button and the contact chips: a repository's brackets, a live site's
// globe, a video's play mark, a Kaggle notebook's dataset.
const ICONS = {
  code: CodeIcon, live: GlobeIcon, video: PlayIcon, figma: FigmaIcon, design: PaletteIcon,
  drive: DriveIcon, kaggle: DatasetIcon, photos: ImageIcon, paper: DocumentIcon, other: LinkIcon,
};

export const iconFor = (kind) => (Object.hasOwn(ICONS, kind ?? '') ? ICONS[kind] : LinkIcon);

export default function LinkKindIcon({ kind, ...props }) {
  const Icon = iconFor(kind);
  return <Icon {...props} />;
}
