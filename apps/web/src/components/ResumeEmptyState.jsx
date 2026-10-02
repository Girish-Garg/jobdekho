import PageTitle from './ui/PageTitle.jsx';
import TemplatePicker from './TemplatePicker.jsx';
import { DocumentIcon } from './Icon.jsx';

// No documents yet: what this page is for, and the templates to start one
// from, open rather than behind a button, since starting one is the only
// thing to do here. The chat beside it can also write one from scratch.
export default function ResumeEmptyState({ templates, busy, onPick }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-8 py-10">
      <div>
        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-8 ring-primary/5">
          <DocumentIcon size={22} />
        </span>
        <PageTitle className="mt-5 text-xl">Your resumes and cover letters</PageTitle>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Start one from a template and it is filled in from your profile. From there it is yours: ask the chat to tailor,
          shorten or restyle it, or edit the LaTeX source yourself.
        </p>
      </div>
      <TemplatePicker templates={templates} busy={busy} onPick={onPick} wide />
    </div>
  );
}
