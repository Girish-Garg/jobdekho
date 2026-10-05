import { describe, it, expect } from 'vitest';
import { fitRows, roomOf } from './resumeFitRows.js';
import { skillGroupRows } from './resumeSkillRows.js';
import { withDefaults } from './emptyProfile.js';

const brief = (rows) => rows.map((row) => [row.id, row.kind, row.ticked]);
const many = (n, prefix) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

describe('fitRows with Smart add', () => {
  const profile = withDefaults({ skills: ['React', 'node'], titles: ['backend engineer'], locations: [], years: null, degree: 'none' });

  it('offers the skills, titles and places Best fit lacks, ticked, and counts the rest as already there', () => {
    const same = [];
    const rows = fitRows(profile, { skills: ['react', 'Go', 'go', 'Redis'], titles: ['Backend Engineer'], locations: ['Pune'] }, 'smart', same);
    expect(brief(rows)).toEqual([
      ['fit:skills:new:go', 'new', true],
      ['fit:skills:new:redis', 'new', true],
      ['fit:locations:new:pune', 'new', true],
    ]);
    expect(same.map((item) => item.label)).toEqual(['react', 'Backend Engineer']);
  });

  it('ticks only as many as the 25 the field keeps, and offers the rest unticked', () => {
    const full = withDefaults({ skills: many(24, 'skill') });
    const rows = fitRows(full, { skills: ['go', 'rust', 'zig'] }, 'smart', []);
    expect(rows.map((row) => row.ticked)).toEqual([true, false, false]);
    expect(roomOf(full)).toEqual({ skills: 1, titles: 25 });
  });

  it('fills an empty years and degree, ticked, and offers a different one unticked', () => {
    expect(brief(fitRows(profile, { years: 2, degree: 'bachelors' }, 'smart', []))).toEqual([['fit:years', 'new', true], ['fit:degree', 'new', true]]);
    const stated = withDefaults({ years: 1, degree: 'masters' });
    const rows = fitRows(stated, { years: 2, degree: 'bachelors' }, 'smart', []);
    expect(rows).toMatchObject([
      { id: 'fit:years', kind: 'newer', value: 2, before: 1, ticked: false },
      { id: 'fit:degree', kind: 'newer', value: 'bachelors', before: 'masters', ticked: false },
    ]);
  });

  it('takes a list or a value the reply left out, or a degree it could not tell, as no word at all', () => {
    expect(fitRows(withDefaults({ skills: ['go'], years: 3, degree: 'phd' }), { degree: 'none' }, 'overwrite', [])).toEqual([]);
  });

  it('counts a years of zero as stated', () => {
    expect(fitRows(withDefaults({ years: 0 }), { years: 0 }, 'smart', [])).toEqual([]);
    expect(fitRows(withDefaults({ years: 0 }), { years: 1 }, 'smart', [])).toMatchObject([{ kind: 'newer', before: 0, ticked: false }]);
  });
});

describe('fitRows with Overwrite', () => {
  it('lists each skill, title and place the resume does not name as a removal, unticked, and ticks a different years or degree', () => {
    const profile = withDefaults({ skills: ['React', 'gRPC'], titles: ['sde'], locations: ['Pune'], years: 1, degree: 'masters' });
    const rows = fitRows(profile, { skills: ['react', 'go'], titles: ['sde'], locations: [], years: 2, degree: 'bachelors' }, 'overwrite', []);
    expect(brief(rows)).toEqual([
      ['fit:skills:new:go', 'new', true],
      ['fit:skills:remove:grpc', 'remove', false],
      ['fit:locations:remove:pune', 'remove', false],
      ['fit:years', 'newer', true],
      ['fit:degree', 'newer', true],
    ]);
  });
});

describe('skillGroupRows', () => {
  const groups = [{ id: 'g1', name: 'Languages', items: ['Python', 'Go'] }, { id: 'g2', name: 'Tools', items: ['Git'] }];

  it('offers a skill the person has nowhere, into their group of that name or a new one', () => {
    const same = [];
    const rows = skillGroupRows(groups, [{ name: 'languages', items: ['Go', 'Rust'] }, { name: 'Cloud', items: ['AWS', 'git'] }, { name: '', items: ['Docker'] }], 'smart', same);
    expect(rows.map((row) => [row.value, row.group, row.groupId, row.ticked])).toEqual([
      ['Rust', 'Languages', 'g1', true],
      ['AWS', 'Cloud', null, true],
      ['Docker', 'Skills', null, true],
    ]);
    expect(same.map((item) => item.label)).toEqual(['Go', 'git']);
  });

  it('in Overwrite, lists each skill the resume names nowhere as a removal from its group, unticked', () => {
    const rows = skillGroupRows(groups, [{ name: 'Languages', items: ['Go'] }], 'overwrite', []);
    expect(rows.map((row) => [row.id, row.kind, row.groupId, row.ticked])).toEqual([
      ['skillGroups:remove:g1:python', 'remove', 'g1', false],
      ['skillGroups:remove:g2:git', 'remove', 'g2', false],
    ]);
  });
});
