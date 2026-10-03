import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import ResumeFactCheck from './ResumeFactCheck.jsx';
import ResumeCoverage from './ResumeCoverage.jsx';
import { DocumentIcon } from './Icon.jsx';

// "Tailor resume for all" as its card in the comparison: the one resume it
// made, aimed at what the jobs share and already saved on the Resume page
// (see the server's chat/tailor-all.js), with the checks a single job's
// tailoring shows, the way to open it, and each job's own chat.
export default function TailorAllCard({ combined, jobs = [], onOpenDocument, onOpenChat }) {
  const named = combined.jobs?.map((id) => jobs.find((job) => job.id === id) ?? { id }) ?? [];
  return (
    <Card as="section" variant="list" aria-label="Tailored for all" className="bg-paper">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <DocumentIcon size={15} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Eyebrow as="span" primary>Tailored resume</Eyebrow>
          <span className="truncate text-sm font-medium text-ink" title={combined.name}>{combined.name}</span>
        </span>
        <Button variant="primary" size="sm" onClick={() => onOpenDocument(combined.documentId)} className="shrink-0">
          Open it
        </Button>
      </div>
      <div className="flex flex-col gap-3 border-t border-line bg-panel px-3 py-3">
        <ResumeFactCheck factCheck={combined.factCheck} />
        <ResumeCoverage coverage={combined.coverage} />
        {named.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>Each job&apos;s own chat:</span>
            {named.map((job) => (
              <button key={job.id} type="button" onClick={() => onOpenChat(`job:${job.id}`)} className="link text-xs">
                {job.company || job.title || 'A job no longer listed'}
              </button>
            ))}
          </p>
        )}
      </div>
    </Card>
  );
}
