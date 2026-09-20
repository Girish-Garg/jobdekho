import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderTex } from '@jobdekho/server/resume/render.js'
import { PROFILE_SHAPES } from '@jobdekho/server/resume/check-shapes.js'
import { listTemplates } from '@jobdekho/server/resume/templates/registry.js'

const TEMPLATE_IDS = listTemplates().map((t) => t.id)

const golden = (name) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8')

// The bullet carries the same injection attempt escape.js is tested against
// on its own: rendering it end to end through a real template is what proves
// the whole pipeline, not just the escaper in isolation, keeps it inert.
const fixtureProfile = {
  basics: {
    name: 'Jane Doe', headline: 'Backend Engineer', email: 'jane@example.com', phone: '',
    location: 'Pune', links: { github: 'github.com/janedoe', linkedin: '', portfolio: '' },
  },
  experience: [{
    id: 'e1', order: 0, title: 'Engineer', organisation: 'Acme', location: '',
    startDate: '2022', endDate: 'Present',
    bullets: ['Shipped 100% \\newcommand{\\x}{pwned} of the roadmap'],
    tech: ['node'], link: '', pinned: false, weight: 0,
  }],
  projects: [], education: [], certifications: [], achievements: [],
  skillGroups: [{ id: 'g1', order: 0, name: 'Languages', items: ['JavaScript'] }],
}

describe('renderTex', () => {
  it('renders the classic template byte-for-byte against the golden fixture', () => {
    expect(renderTex('classic', fixtureProfile, {})).toBe(golden('resume-golden-classic.tex'))
  })

  it('throws on an unknown template id rather than reading a nonexistent file', () => {
    expect(() => renderTex('nope', fixtureProfile, {})).toThrow(/unknown resume template/)
  })

  it('falls back to a placeholder name so an unfilled profile still compiles to something', () => {
    const empty = { basics: {}, experience: [], projects: [], education: [], certifications: [], achievements: [], skillGroups: [] }
    expect(renderTex('classic', empty, {})).toContain('\\resHeader{Your Name}')
  })

  it('honours a selection that reorders and drops entries', () => {
    const twoJobs = {
      ...fixtureProfile,
      experience: [
        ...fixtureProfile.experience,
        { id: 'e2', order: 1, title: 'Junior Engineer', organisation: 'Old Co', location: '', startDate: '2020', endDate: '2022', bullets: [], tech: [], link: '', pinned: false, weight: 0 },
      ],
    }
    const tex = renderTex('classic', twoJobs, { experience: ['e2'] })
    expect(tex).toContain('Junior Engineer')
    // The excluded entry's own header call, not a substring match: "Engineer"
    // alone would also match inside "Junior Engineer".
    expect(tex).not.toContain('{Engineer}{Acme}')
  })

  it('renders every known template without throwing', () => {
    for (const id of ['classic', 'compact', 'academic']) {
      expect(() => renderTex(id, fixtureProfile, {})).not.toThrow()
    }
  })
})

// A record with no headline failed to compile in all three templates: the
// header read "{\\normalsize #2}\\\\", and with #2 empty LaTeX answered
// "There's no line here to end".
//
// This is checked in the TEMPLATE, not in the rendered file, because the
// rendered file cannot show it: it says \resHeader{A Candidate}{}{Pune},
// and the empty group only exists after LaTeX expands the macro. An
// assertion over the output text would pass while every PDF failed, which
// is exactly what happened when this test was first written. What proves
// the templates compile is `npm run resume:check`, which runs pdflatex over
// every shape in resume/check-shapes.js; the suite must not, since it would
// then need LaTeX installed to pass.
describe('templates never break a line that might not exist', () => {
  const source = (id) => readFileSync(fileURLToPath(new URL(`../src/resume/templates/${id}.tex`, import.meta.url)), 'utf8');
  const macro = (tex, name) => {
    const from = tex.indexOf(`\\newcommand{\\${name}}`);
    const to = tex.indexOf('\\newcommand', from + 1);
    return tex.slice(from, to === -1 ? undefined : to);
  };

  for (const id of TEMPLATE_IDS) {
    it(`${id} puts every header break behind the empty check`, () => {
      const header = macro(source(id), 'resHeader');
      expect(header).toContain('\\resHeaderLine');
      expect(header).not.toMatch(/\\\\/);
    });

    it(`${id} ends a skills row without a break`, () => {
      expect(macro(source(id), 'resSkillRow')).not.toMatch(/\\\\/);
    });
  }

  it('renders every shape a record takes without throwing', () => {
    for (const id of TEMPLATE_IDS) {
      for (const profile of Object.values(PROFILE_SHAPES)) {
        expect(() => renderTex(id, profile, {})).not.toThrow();
      }
    }
  });

  it('still prints the parts that are filled in', () => {
    const tex = renderTex('classic', PROFILE_SHAPES['no headline'], {});
    expect(tex).toContain('A Candidate');
    expect(tex).toContain('a@b.c');
  });
});
