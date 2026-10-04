import { useState } from 'react';

// Each red flag in the server's own factual words ("Asks applicants to pay
// a ₹1,500 registration fee"), which state what the posting says and never
// call it a scam. The sentence that raised each one waits behind a press:
// the reason is usually enough to decide whether to look closer. For an ad
// shared under several company names the evidence is those names, which
// read as a list rather than a quotation.
export default function CautionReasons({ caution }) {
  const [shown, setShown] = useState(false);
  const withWords = caution.some((flag) => flag.evidence);

  return (
    <>
      <ul className="flex flex-col gap-1.5 text-sm text-ink/85">
        {caution.map((flag, i) => (
          <li key={`${flag.code}-${i}`} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember/70" />
            <span className="min-w-0">
              <span className="block">{flag.reason}</span>
              {shown && flag.evidence && (flag.code === 'shared-ad'
                ? <span className="mt-0.5 block text-xs text-muted">{flag.evidence}</span>
                : <q className="mt-0.5 block text-xs italic text-muted">{flag.evidence}</q>)}
            </span>
          </li>
        ))}
      </ul>
      {withWords && (
        <button type="button" aria-expanded={shown} onClick={() => setShown(!shown)} className="link mt-2.5 text-xs">
          {shown ? 'Hide the evidence' : 'Show the evidence'}
        </button>
      )}
    </>
  );
}
