import Card from './ui/Card.jsx';
import SettingsCard from './SettingsCard.jsx';
import ApplySignIns from './ApplySignIns.jsx';
import { APPLY_ASSIST } from '../lib/features.js';
import { FolderIcon, ShieldCheckIcon, SparkleIcon } from './Icon.jsx';

// Where a person's data lives and what leaves the computer, said plainly,
// since there is no account and nothing hosted to ask about it.
export default function YourDataCard() {
  return (
    <SettingsCard icon={<ShieldCheckIcon size={18} />} title="Your data" hint="There is no account and nothing is hosted.">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact icon={<FolderIcon size={15} />} title="Kept on this computer">
          Your profile, documents, chats and saved jobs are files in JobDekho&apos;s data folder.
        </Fact>
        <Fact icon={<SparkleIcon size={15} />} title="Sent only when you ask">
          A question goes to the AI you picked: Claude Code sends it to Anthropic, Antigravity to Google, and
          Ollama keeps it on this computer. A web search sends the question alone.
        </Fact>
        {APPLY_ASSIST && <ApplySignIns />}
      </ul>
    </SettingsCard>
  );
}

function Fact({ icon, title, children }) {
  return (
    <Card as="li" variant="inset" className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <span className="text-sm">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="text-muted">{children}</span>
      </span>
    </Card>
  );
}
