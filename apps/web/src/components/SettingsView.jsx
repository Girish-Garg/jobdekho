import { useProviderSetting } from '../lib/useProviderSetting.js';
import { webSentence } from '../lib/providerStatus.js';
import ThemeChoice from './ThemeChoice.jsx';
import ProviderChoice from './ProviderChoice.jsx';
import ModelChoice from './ModelChoice.jsx';
import SettingsCard from './SettingsCard.jsx';
import { CheckIcon, FolderIcon, GlobeIcon, PaletteIcon, ShieldCheckIcon, SparkleIcon } from './Icon.jsx';

const SAVED = {
  saving: <span className="text-xs text-muted">Saving...</span>,
  saved: <span className="inline-flex items-center gap-1 text-xs font-semibold text-applied"><CheckIcon size={12} /> Saved</span>,
  error: <span className="text-xs font-semibold text-ember">Not saved</span>,
};

// Every setting saves as it is picked, so there is no Save button to find.
export default function SettingsView() {
  const { provider, ollamaModel, providers, saved, pick, pickModel } = useProviderSetting();
  const ollama = providers.find((p) => p.id === 'ollama');

  return (
    <section className="px-4 pb-12 pt-8">
      {/* The Postings page's width, so moving between the two does not
          change where the page's edges are. Wide, the AI CLI takes one
          column and the smaller two stack in the other. */}
      <div className="mx-auto w-full max-w-[84rem]">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Saved on this computer as you pick.</p>

        <div className="mt-6 grid grid-cols-1 items-start gap-5 min-[1100px]:grid-cols-2">
          <SettingsCard
            icon={<SparkleIcon size={18} />}
            title="AI CLI"
            hint="The AI command-line tool that does JobDekho's AI work, on your own subscription or your own computer. Pick which one it asks first."
            note={<span aria-live="polite" className="shrink-0 pt-1">{SAVED[saved] ?? null}</span>}
          >
            <ProviderChoice providers={providers} pref={provider} onChange={pick} />
            {ollama && <ModelChoice provider={ollama} saved={ollamaModel} onChange={pickModel} />}
            {providers.length > 0 && (
              <p className="mt-4 flex items-start gap-2 text-sm text-muted">
                <GlobeIcon size={14} className="mt-[3px] shrink-0 text-accent" />
                {webSentence(providers)}
              </p>
            )}
          </SettingsCard>

          <div className="flex flex-col gap-5">
            <SettingsCard icon={<PaletteIcon size={18} />} title="Appearance" hint="How JobDekho looks on this computer.">
              <ThemeChoice />
            </SettingsCard>

            <SettingsCard icon={<ShieldCheckIcon size={18} />} title="Your data" hint="There is no account and nothing is hosted.">
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Fact icon={<FolderIcon size={15} />} title="Kept on this computer">
                  Your profile, documents, chats and saved jobs are files in JobDekho&apos;s data folder.
                </Fact>
                <Fact icon={<SparkleIcon size={15} />} title="Sent only when you ask">
                  A question goes to the AI through your own CLI, and nowhere else.
                </Fact>
              </ul>
            </SettingsCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ icon, title, children }) {
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-paper/60 p-3.5">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <span className="text-sm">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="text-muted">{children}</span>
      </span>
    </li>
  );
}
