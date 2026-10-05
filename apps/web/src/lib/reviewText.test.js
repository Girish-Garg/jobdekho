import { describe, it, expect } from 'vitest';
import { applyLabel, countLabels, fillLine, sameLine, summaryLine } from './reviewText.js';
import { changeNote, fieldLabel, fieldValue, rowHeading } from './reviewRowText.js';
import { chipLines, isChip, reviewGroups, roomLeft, withinRoom } from './reviewGroups.js';

const rows = (...kinds) => kinds.map((kind, i) => ({ id: `r${i}`, kind, section: 'projects' }));

describe('the review summary', () => {
  it('counts the rows by kind, leaving out a kind there is none of', () => {
    expect(countLabels(rows('new', 'new', 'newer', 'changed', 'changed', 'remove'))).toEqual([
      { kind: 'new', text: '2 new' }, { kind: 'newer', text: '1 newer' }, { kind: 'changed', text: '2 changed' }, { kind: 'remove', text: '1 to remove' },
    ]);
    expect(countLabels(rows('newer'))).toEqual([{ kind: 'newer', text: '1 newer' }]);
  });

  it('names the mode and says nothing is saved yet', () => {
    expect(summaryLine({ mode: 'smart', rows: rows('new', 'newer') })).toBe('Smart add found 2 changes. Nothing is saved until you apply them and save your profile.');
    expect(summaryLine({ mode: 'overwrite', rows: rows('remove') })).toMatch(/^Overwrite found 1 change\./);
  });

  it('says how many changes are only the resume saying it differently', () => {
    expect(summaryLine({ mode: 'overwrite', rows: rows('new', 'changed', 'changed', 'remove') }))
      .toBe('Overwrite found 4 changes, 2 of them where the resume says it differently. Nothing is saved until you apply them and save your profile.');
  });

  it('counts the kept changes on the apply button', () => {
    expect(applyLabel(8)).toBe('Apply 8 changes');
    expect(applyLabel(1)).toBe('Apply 1 change');
  });

  it('says in one line what is already on the profile, a skill counted once', () => {
    const same = [
      { section: 'experience', label: 'Analyst' },
      { section: 'projects', label: 'A' }, { section: 'projects', label: 'B' },
      { section: 'skillGroups', label: 'Go' }, { section: 'fit', field: 'skills', label: 'go' }, { section: 'fit', field: 'skills', label: 'rust' },
      { section: 'fit', field: 'locations', label: 'Pune' }, { section: 'fit', field: 'years', label: '2' },
    ];
    expect(sameLine(same)).toBe('Already on your profile: 1 role, 2 projects, 2 skills and 1 place, nothing to change');
    expect(sameLine([])).toBe('');
  });

  it('tells the resume card how many changes are waiting, or that there are none', () => {
    expect(fillLine({ rows: rows('new', 'new') })).toBe('Found 2 changes to review.');
    expect(fillLine({ rows: [] })).toBe('Nothing to change. Your profile already has what this resume says.');
  });
});

describe('a row in words', () => {
  it('heads a new entry with where and when, a removal with why, and a Newer one with neither', () => {
    expect(rowHeading({ section: 'experience', kind: 'new', entry: { title: 'Software Engineer Intern', organisation: 'Acme Labs', startDate: 'Jan 2026', endDate: 'Present' } }))
      .toEqual({ title: 'Software Engineer Intern', at: 'at Acme Labs', when: 'Jan 2026 to now' });
    expect(rowHeading({ section: 'projects', kind: 'new', entry: { title: 'Build Your Own Docker', startDate: 'Jun 2026' } }))
      .toEqual({ title: 'Build Your Own Docker', at: '', when: 'Jun 2026' });
    expect(rowHeading({ section: 'projects', kind: 'remove', entry: { title: 'Weather CLI', organisation: '' } }))
      .toEqual({ title: 'Weather CLI', at: '', when: 'not on this resume' });
    expect(rowHeading({ section: 'certifications', kind: 'newer', before: { title: 'Cloud Practitioner', organisation: 'AWS' }, entry: {} }))
      .toEqual({ title: 'Cloud Practitioner', at: 'from AWS', when: '' });
    expect(rowHeading({ section: 'experience', kind: 'new', entry: { organisation: 'Demo Labs' } }).title).toBe('Demo Labs');
    expect(rowHeading({ section: 'experience', kind: 'changed', before: { title: 'Engineer', organisation: 'Acme' }, entry: { title: 'SDE' } }))
      .toEqual({ title: 'Engineer', at: 'at Acme', when: '' });
  });

  it('notes what a Newer row changes, points last and counted as the new ones', () => {
    const before = { bullets: ['Fixed 12 numerical edge cases'] };
    const entry = { bullets: ['Fixed 12 numerical edge cases', 'Added 4 functions', 'Reviewed 30 pull requests'], link: 'https://maap.vercel.app' };
    expect(changeNote({ section: 'experience', fields: ['endDate', 'bullets'], before, entry })).toBe('End date and 2 points');
    expect(changeNote({ section: 'projects', fields: ['bullets', 'link'], before: {}, entry: { bullets: ['One'], link: 'https://maap.vercel.app' } })).toBe('Live link and 1 point');
    expect(changeNote({ section: 'certifications', fields: ['organisation', 'endDate'], before: {}, entry: {} })).toBe('Issuer and expiry date');
    expect(changeNote({ section: 'projects', fields: ['link'], before: {}, entry: { link: 'https://demo.dev' } })).toBe('Link');
  });

  it('names a field and its value as the profile does', () => {
    expect([fieldLabel('links.github'), fieldLabel('years'), fieldLabel('titles')]).toEqual(['GitHub', 'Years of experience', 'Target titles']);
    expect([fieldValue('years', 0), fieldValue('years', 1), fieldValue('years', 2.5), fieldValue('degree', 'bachelors'), fieldValue('email', 'a@b.c')])
      .toEqual(['Fresher', '1 year', '2.5 years', "Bachelor's", 'a@b.c']);
  });
});

describe('reviewGroups', () => {
  it('groups rows by the part of the record they change, in the order of the page', () => {
    const groups = reviewGroups([
      { id: 'a', section: 'fit' }, { id: 'b', section: 'projects' }, { id: 'c', section: 'basics' }, { id: 'd', section: 'skillGroups' }, { id: 'e', section: 'projects' },
    ]);
    expect(groups.map((group) => [group.label, group.rows.map((row) => row.id)])).toEqual([
      ['Basics', ['c']], ['Projects', ['b', 'e']], ['Skills', ['d']], ['Best fit', ['a']],
    ]);
  });
});

describe('chipLines', () => {
  it('lines up chips under what they change, a removal on a line of its own', () => {
    const rows = [
      { id: 'a', section: 'fit', field: 'skills', kind: 'new', value: 'go' },
      { id: 'b', section: 'fit', field: 'skills', kind: 'remove', value: 'grpc' },
      { id: 'c', section: 'fit', field: 'skills', kind: 'new', value: 'rust' },
      { id: 'd', section: 'skillGroups', kind: 'new', value: 'Rust', group: 'Languages', groupId: 'g1' },
      { id: 'e', section: 'skillGroups', kind: 'new', value: 'AWS', group: 'Cloud', groupId: null },
      { id: 'f', section: 'skillGroups', kind: 'remove', value: 'AGY', group: 'AI', groupId: 'g2' },
    ];
    expect(chipLines(rows).map((line) => [line.label, line.field, line.rows.map((row) => row.id)])).toEqual([
      ['Skills', 'skills', ['a', 'c']],
      ['Skills, not on the resume', 'skills', ['b']],
      ['Languages', null, ['d']],
      ['Cloud, a new group', null, ['e']],
      ['AI, not on the resume', null, ['f']],
    ]);
  });

  it('takes skills, titles and places as chips, and entries, basics, years and a degree as rows', () => {
    expect([
      { section: 'fit', field: 'locations' }, { section: 'skillGroups' }, { section: 'fit', field: 'years' }, { section: 'basics', field: 'email' }, { section: 'projects' },
    ].map(isChip)).toEqual([true, true, false, false, false]);
  });
});

describe('the room in Best fit', () => {
  const skill = (id, kind) => ({ id, kind, section: 'fit', field: 'skills' });
  const list = [skill('go', 'new'), skill('rust', 'new'), skill('zig', 'new'), skill('grpc', 'remove')];

  it('is what was left, plus ticked removals, less ticked additions', () => {
    expect(roomLeft(list, new Set(['go']), { skills: 1 }, 'skills')).toBe(0);
    expect(roomLeft(list, new Set(['go', 'grpc']), { skills: 1 }, 'skills')).toBe(1);
    expect(roomLeft(list, new Set(['go']), undefined, 'skills')).toBe(Infinity);
  });

  it('lets the last ticked additions go when there is no room for them', () => {
    expect([...withinRoom(list, new Set(['go', 'rust', 'zig']), { skills: 1 })]).toEqual(['go']);
    expect([...withinRoom(list, new Set(['go', 'rust', 'zig', 'grpc']), { skills: 1 })].sort()).toEqual(['go', 'grpc', 'rust']);
  });
});
