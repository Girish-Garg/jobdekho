import { WarningIcon } from './Icon.jsx';

// The LaTeX guard's verdict: the lines it will not let near pdflatex, each
// as the guard wrote it (see the server's resume/guard/messages.js). Used by
// a chat card whose version cannot be applied and by the workspace when a
// compile was refused, so a refusal reads the same wherever it is met.
export default function GuardProblems({ title, problems, children = null }) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-xl border border-ember/30 bg-ember/5 px-3 py-2.5">
      <p className="flex items-start gap-2 text-sm font-semibold text-ember">
        <WarningIcon size={14} className="mt-0.5" />
        <span>{title}</span>
      </p>
      {children}
      {problems.length > 0 && (
        <ul className="flex flex-col gap-1 pl-6">
          {problems.map((problem) => (
            <li key={problem} className="list-disc break-words font-mono text-xs leading-relaxed text-ink/85 marker:text-ember">{problem}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
