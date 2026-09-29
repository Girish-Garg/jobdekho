import { SparkleIcon } from './Icon.jsx';

// A person landing here with nothing needs to know why they would bother
// before being shown a pile of blank inputs, and the quickest way in: the
// resume card beside this reads a PDF and fills the record from it.
export default function ProfileEmptyState({ onStart }) {
  return (
    <div className="flex max-w-2xl flex-col items-start gap-4 rounded-2xl border border-line bg-panel p-6">
      <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
        <SparkleIcon size={18} />
      </span>
      <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">Start your profile</h2>
      <p className="text-sm leading-relaxed text-muted">
        Your profile is your full career record: experience, projects, education, skills, certifications and
        achievements, each holding as many entries as you need. The skills, target titles, experience and degree
        in it are what Best fit on Postings ranks jobs by, and the Resume tab builds from it. The quickest start
        is to upload your resume and let the AI on this computer fill it in.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition-colors duration-fast ease-ease hover:bg-primary/90"
      >
        Start writing it
      </button>
    </div>
  );
}
