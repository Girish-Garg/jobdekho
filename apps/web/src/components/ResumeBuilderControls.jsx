import ResumeBuilderSection from './ResumeBuilderSection.jsx';

const ENTRY_SECTIONS = [
  { key: 'experience', label: 'Experience' },
  { key: 'projects', label: 'Projects' },
  { key: 'education', label: 'Education' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'achievements', label: 'Achievements' },
];

const entryRow = (entry) => ({
  id: entry.id,
  primary: entry.title || 'Untitled',
  secondary: entry.organisation ? `at ${entry.organisation}` : '',
});

const skillRow = (group) => ({
  id: group.id,
  primary: group.name || 'Untitled group',
  secondary: group.items.join(', '),
});

// Template choice plus one checklist per section. `selection` always carries
// a concrete, ordered id list for every section (the view materializes
// "everything, in profile order" the first time a person opens this, so the
// checklist has something to check and reorder from the start) - see
// ResumeBuilderView.jsx.
export default function ResumeBuilderControls({ profile, templates, selection, onChange }) {
  const setTemplate = (template) => onChange({ ...selection, template });
  const setSection = (key) => (ids) => onChange({ ...selection, sections: { ...selection.sections, [key]: ids } });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Template</h3>
        <div className="flex flex-col gap-1.5">
          {templates.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-line bg-paper px-2.5 py-1.5">
              <input type="radio" name="resume-template" className="mt-1 shrink-0" checked={selection.template === t.id} onChange={() => setTemplate(t.id)} />
              <span className="flex flex-col">
                <span className="text-sm text-ink">{t.name}</span>
                <span className="text-xs text-muted">{t.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {ENTRY_SECTIONS.map(({ key, label }) => (
        <ResumeBuilderSection
          key={key}
          title={label}
          entries={(profile[key] ?? []).map(entryRow)}
          selectedIds={selection.sections[key] ?? []}
          onChange={setSection(key)}
        />
      ))}

      <ResumeBuilderSection
        title="Skills"
        entries={(profile.skillGroups ?? []).map(skillRow)}
        selectedIds={selection.sections.skillGroups ?? []}
        onChange={setSection('skillGroups')}
      />
    </div>
  );
}
