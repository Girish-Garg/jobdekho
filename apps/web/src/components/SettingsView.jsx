import { useCurrentSection } from '../lib/useCurrentSection.js';
import ThemeChoice from './ThemeChoice.jsx';
import EffectsChoice from './EffectsChoice.jsx';
import SettingsCard from './SettingsCard.jsx';
import SettingsAiCard from './SettingsAiCard.jsx';
import SetupCard from './SetupCard.jsx';
import RefreshSettingsCard from './RefreshSettingsCard.jsx';
import AdzunaCard from './AdzunaCard.jsx';
import YourDataCard from './YourDataCard.jsx';
import ProfileIndex from './ProfileIndex.jsx';
import { PaletteIcon } from './Icon.jsx';

// The page's sections, in order, for the index beside them.
const SECTIONS = [
  { id: 'settings-setup', label: 'Setup check' },
  { id: 'settings-ai', label: 'AI CLI' },
  { id: 'settings-postings', label: 'Postings' },
  { id: 'settings-adzuna', label: 'Adzuna' },
  { id: 'settings-appearance', label: 'Appearance' },
  { id: 'settings-data', label: 'Your data' },
];
const IDS = SECTIONS.map((s) => s.id);

// Every setting saves as it is picked, so there is no Save button to find.
// Laid out like the Profile: an index of the sections in a rail that stays
// put, the one being read marked, and the cards in one column beside it. Two
// columns of cards of every height made a page that had to be scanned end to
// end to find anything. The Postings page's width, so moving between the two
// does not change where the page's edges are.
export default function SettingsView() {
  const [current, jumpTo] = useCurrentSection(IDS);

  return (
    <section className="px-4 pb-12 pt-8">
      <div className="mx-auto w-full max-w-[84rem]">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Saved on this computer as you pick.</p>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 min-[1100px]:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="sticky top-4 hidden rounded-2xl border border-line bg-panel p-2 min-[1100px]:block">
            <ProfileIndex rows={SECTIONS} current={current} onJump={jumpTo} />
          </aside>
          <div className="flex min-w-0 flex-col gap-5">
            <div id="settings-setup" className="scroll-mt-4"><SetupCard /></div>
            <div id="settings-ai" className="scroll-mt-4"><SettingsAiCard /></div>
            <div id="settings-postings" className="scroll-mt-4"><RefreshSettingsCard /></div>
            <div id="settings-adzuna" className="scroll-mt-4"><AdzunaCard /></div>
            <div id="settings-appearance" className="scroll-mt-4">
              <SettingsCard icon={<PaletteIcon size={18} />} title="Appearance" hint="How JobDekho looks on this computer.">
                <ThemeChoice />
                <EffectsChoice />
              </SettingsCard>
            </div>
            <div id="settings-data" className="scroll-mt-4"><YourDataCard /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
