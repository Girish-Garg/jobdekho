import Eyebrow from './ui/Eyebrow.jsx';

// Keyword coverage in the terms of the feed's fit: how many of the skills
// this posting names a keyword matcher finds in the resume, before and
// after the rewrite. The counts are the server's and the matcher is the one
// the fit score uses, so "9 of 14" here means what "matches react, node"
// means on the card. Only honest gains are counted, which is why the missing
// list can name a skill the posting wants and the rewrite still lacks.
function sentence({ before, after, total }) {
  const change = after > before ? `, up from ${before}` : after < before ? `, down from ${before}` : ', as before';
  return `Matches ${after} of ${total} skills this job names${change}.`;
}

const percent = (n, total) => Math.round((100 * n) / total);

export default function ResumeCoverage({ coverage }) {
  if (!coverage) return null;
  const { before, after, total, gained = [], missing = [] } = coverage;
  if (!total) return <p className="text-sm text-ink/80">This posting names no skills the matcher knows, so there is no coverage to count.</p>;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-ink">
        <span className="font-semibold">{sentence(coverage)}</span>{' '}
        <span className="text-muted">{`${percent(before, total)}% to ${percent(after, total)}%`}</span>
      </p>
      {gained.length > 0 && (
        <p className="text-sm text-ink/80">
          <Eyebrow as="span" mono>Gained </Eyebrow>{gained.join(', ')}
        </p>
      )}
      {missing.length > 0 && (
        <p className="text-sm text-ink/80">
          <Eyebrow as="span" mono>Still missing </Eyebrow>{missing.join(', ')}
          <span className="text-muted"> (not added because your resume does not show them)</span>
        </p>
      )}
    </div>
  );
}
