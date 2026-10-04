import CautionReasons from './CautionReasons.jsx';
import { WarningIcon } from './Icon.jsx';

// The pane's Caution card: each red flag the posting states, in the
// server's factual wording, with the evidence behind a press (see
// CautionReasons.jsx). Only stated red flags count: a rubric of weak
// signals fires on "no pay stated", and so on Infosys, EY and Google. No
// flags, no card: they can name a problem, but their absence cannot clear a
// posting, so there is no "looks fine" state to show.
//
// Children sit under the reasons, inside the same card: the pane puts the
// "is this job real?" check there, beside the evidence that raised the
// question. Ember, the palette's colour for things that want attention,
// marks it apart from the fit above it.
export default function CautionCard({ caution, children }) {
  if (!caution?.length) return null;

  return (
    <section aria-label="Caution" className="rounded-xl border border-ember/25 bg-ember/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ember">
        <WarningIcon size={15} />
        Caution
      </p>
      <div className="mt-2">
        <CautionReasons caution={caution} />
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}
