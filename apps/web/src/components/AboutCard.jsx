import { REPO_URL, APP_VERSION } from '../lib/project.js';
import SettingsCard from './SettingsCard.jsx';
import Button from './ui/Button.jsx';
import { StarIcon, ExternalLinkIcon } from './Icon.jsx';

// Who made JobDekho and where it lives, and the one thing a person who likes
// it can do for it: a star is how other people find a free project on
// GitHub. Asked once, here, rather than in the way of the job search. The
// link opens GitHub in its own tab, so this page stays where it was.
export default function AboutCard() {
  return (
    <SettingsCard
      icon={<StarIcon size={18} />}
      title="About JobDekho"
      hint={`Free and open source, made by Girish Garg${APP_VERSION ? `. Version ${APP_VERSION}` : ''}.`}
    >
      <p className="max-w-xl text-sm text-ink/85">
        If JobDekho helped your search, a star on GitHub helps other people find it too.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button as="a" variant="tint" href={REPO_URL} target="_blank" rel="noopener noreferrer" className="gap-2 px-4 py-2">
          <StarIcon size={14} />
          Star on GitHub
        </Button>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5 text-sm">
          See the code
          <ExternalLinkIcon size={12} />
        </a>
      </div>
    </SettingsCard>
  );
}
