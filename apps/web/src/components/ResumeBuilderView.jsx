import { useEffect, useState } from 'react';
import { getProfile, getResumeTemplates, getResumeSelection, putResumeSelection } from '../api.js';
import ResumeBuilderControls from './ResumeBuilderControls.jsx';
import ResumeBuilderPreview from './ResumeBuilderPreview.jsx';

const SECTION_KEYS = ['experience', 'projects', 'education', 'certifications', 'achievements', 'skillGroups'];
const ENTRY_SECTIONS = ['experience', 'projects', 'education', 'certifications', 'achievements'];

// A profile with a name but nothing under it is not a resume yet - the same
// rule the server checks before compiling (see apps/server/src/api/resume.js)
// so this screen can say so before ever asking for a PDF.
function hasContent(profile) {
  return Boolean(profile?.basics?.name) && ENTRY_SECTIONS.some((key) => (profile[key] ?? []).length > 0);
}

// A saved selection may be missing a section entirely - a person who has
// never touched this screen, or who added an entry since the last save -
// which is filled here with every id the profile currently has, in the
// profile's own order, so the checklist always has something concrete to
// show and reorder rather than an empty list for a section with real content.
// A `plan` (a validated resume-tailor plan for one job, see
// ResumeBuilderOverlay.jsx) overrides that fallback for the sections it
// picked, so opening the builder from a tailored result starts checked to
// what the plan chose rather than to everything the profile has.
function materialize(profile, saved, plan) {
  const sections = {};
  for (const key of SECTION_KEYS) {
    const picked = plan?.sections?.[key];
    sections[key] = picked ? picked.map((entry) => entry.id) : saved?.sections?.[key] ?? (profile[key] ?? []).map((entry) => entry.id);
  }
  return { template: saved?.template ?? 'classic', sections };
}

const slug = (name) => (name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'resume';

// `plan` is set only when this is opened seeded from a tailored resume
// (see ResumeBuilderOverlay.jsx); the Resume tab renders this with no props
// at all, and that path is untouched by anything below.
export default function ResumeBuilderView({ plan = null }) {
  const [profile, setProfile] = useState(undefined);
  const [templates, setTemplates] = useState([]);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getProfile(), getResumeTemplates(), getResumeSelection()])
      .then(([p, t, saved]) => {
        if (!alive) return;
        setProfile(p);
        setTemplates(t);
        setSelection(materialize(p ?? {}, saved, plan));
      })
      .catch(() => alive && setProfile(null));
    return () => {
      alive = false;
    };
    // Deliberately once: `plan` seeds the very first selection and is never
    // expected to change under an already-open builder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(next) {
    setSelection(next);
    // Fire and forget, and only for the person's own general resume: a plan
    // opened from one job's tailoring is never saved over that, or a second
    // tailoring - or just reopening the Resume tab - would inherit picks and
    // wording that had nothing to do with it.
    if (!plan) putResumeSelection(next).catch(() => {});
  }

  if (profile === undefined) return <p className="p-6 font-mono text-xs text-muted">Loading...</p>;

  if (!hasContent(profile) || !selection) {
    return (
      <div className="flex max-w-xl flex-col gap-3 p-6">
        <h3 className="font-display text-lg font-bold tracking-tight">Nothing to build yet</h3>
        <p className="text-sm leading-relaxed text-muted">
          The resume builder turns your profile into a PDF. Add your name on the Profile tab, plus at
          least one section (experience, a project, education, a certification or an achievement),
          then come back here to pick a template and what goes in.
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[360px_1fr] lg:overflow-hidden">
      <div className="min-h-0 overflow-y-auto">
        <ResumeBuilderControls profile={profile} templates={templates} selection={selection} onChange={onChange} />
      </div>
      <ResumeBuilderPreview selection={selection} plan={plan} fileName={slug(profile.basics?.name)} />
    </div>
  );
}
