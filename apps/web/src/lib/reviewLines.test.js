import { describe, it, expect } from 'vitest';
import { detailLines } from './reviewLines.js';

// A line as its text, with each marked part in brackets: [-gone] or [+added].
const show = (lines) => lines.map((line) => line.parts.map((part) => (part.mark ? `[${part.mark === 'gone' ? '-' : '+'}${part.text}]` : part.text)).join(''));

const NEWER = {
  section: 'experience', kind: 'newer', fields: ['endDate', 'bullets'],
  before: { title: 'Open Source Contributor', organisation: 'stdlib', startDate: 'Mar 2024', endDate: 'Apr 2024', bullets: ['Fixed 12 numerical edge cases'] },
  entry: { title: 'Open Source Contributor', organisation: 'stdlib', startDate: 'Mar 2024', endDate: 'Present', bullets: ['Fixed 12 numerical edge cases', 'Added 4 statistics functions with tests'] },
};

describe('detailLines', () => {
  it('strikes what goes from the profile and lights what the resume adds', () => {
    expect(show(detailLines(NEWER, 'mine'))).toEqual(['Mar 2024 to [-Apr 2024]', 'Fixed 12 numerical edge cases']);
    expect(show(detailLines(NEWER, 'theirs'))).toEqual(['Mar 2024 to [+now]', 'Fixed 12 numerical edge cases', '[+Added 4 statistics functions with tests]']);
  });

  it('shows a changed title, company, place and stack, and a link the resume adds', () => {
    const row = {
      section: 'projects', kind: 'newer', fields: ['title', 'location', 'tech', 'link'],
      before: { title: 'Maap', location: 'Pune', tech: ['React'], links: [{ kind: 'code', url: 'https://github.com/demo/maap', label: '' }] },
      entry: { title: 'Maap PWA', location: 'Remote', tech: ['React', 'Node'], link: 'https://maap.vercel.app/' },
    };
    expect(show(detailLines(row, 'mine'))).toEqual(['[-Maap]', '[-Pune]', '[-React]', 'github.com/demo/maap']);
    expect(show(detailLines(row, 'theirs'))).toEqual(['[+Maap PWA]', '[+Remote]', '[+React, Node]', '[+maap.vercel.app]']);
  });

  it('reads an empty end on the profile as now, and on the resume as no end', () => {
    const row = { section: 'projects', kind: 'newer', fields: ['bullets'], before: { startDate: 'Jan 2025', endDate: '' }, entry: { startDate: 'Jun 2026', bullets: ['One'] } };
    expect(show(detailLines(row, 'mine'))).toEqual(['Jan 2025 to now']);
    expect(show(detailLines(row, 'theirs'))).toEqual(['Jun 2026', '[+One]']);
  });

  it('sets a Changed row\'s two sides apart the same way', () => {
    const row = { section: 'experience', kind: 'changed', fields: ['endDate'], before: { startDate: 'May 2024', endDate: 'Present' }, entry: { startDate: 'May 2024', endDate: 'Aug 2024' } };
    expect(show(detailLines(row, 'mine'))).toEqual(['May 2024 to [-now]']);
    expect(show(detailLines(row, 'theirs'))).toEqual(['May 2024 to [+Aug 2024]']);
  });

  it('marks nothing on a row with one side only', () => {
    const row = { section: 'projects', kind: 'new', entry: { title: 'Docker', startDate: 'Jun 2026', bullets: ['Built a container runtime'], link: 'github.com/demo/docker' } };
    expect(show(detailLines(row, 'theirs'))).toEqual(['Jun 2026', 'github.com/demo/docker', 'Built a container runtime']);
    const gone = { section: 'projects', kind: 'remove', entry: { title: 'Weather CLI', startDate: '2023', endDate: '2023' } };
    expect(show(detailLines(gone, 'mine'))).toEqual(['2023 to 2023']);
  });

  it('tells a point from a link from plain text, for the way each is drawn', () => {
    const kinds = detailLines({ section: 'projects', kind: 'new', entry: { location: 'Pune', link: 'demo.dev', bullets: ['One'] } }, 'theirs').map((line) => line.kind);
    expect(kinds).toEqual(['text', 'link', 'point']);
  });
});
