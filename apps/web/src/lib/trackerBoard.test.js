import { describe, it, expect } from 'vitest';
import { LANES, CLOSED, droppedStage, flagOf, sectionsOf, cardDate, lastAt } from './trackerBoard.js';

const NOW = Date.parse('2026-10-15T12:00:00.000Z');
const ago = (days) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const entry = (stage, days, extra = {}) => ({ id: `${stage}${days}`, company: 'X', role: '', stage, stageAt: days == null ? null : ago(days), events: days == null ? [] : [{ id: 'a', at: ago(days), text: 'x' }], ...extra });

describe('the board lanes', () => {
  it('cover every stage once, with Closed apart', () => {
    expect([...LANES, CLOSED].flatMap((lane) => lane.stages).sort()).toEqual(['applied', 'assessment', 'closed', 'emailed', 'interview', 'offer', 'replied']);
  });

  it('keeps a stage the lane already holds, else takes the lane first', () => {
    const process = LANES.find((lane) => lane.key === 'process');
    expect(droppedStage({ stage: 'interview' }, process)).toBe('interview');
    expect(droppedStage({ stage: 'applied' }, process)).toBe('replied');
  });
});

describe('flagOf', () => {
  it('flags what waits on the person, news, and a long silence, in one short word', () => {
    expect(flagOf(entry('emailed', 6, { contact: { email: 'a@b.example' } }), NOW)).toMatchObject({ text: 'Follow up', tone: 'need', action: 'Write a follow-up' });
    expect(flagOf(entry('emailed', 2, { contact: { email: 'a@b.example' } }), NOW)).toBeNull();
    expect(flagOf(entry('offer', 1), NOW)).toMatchObject({ text: 'Offer', tone: 'need' });
    expect(flagOf(entry('assessment', 1), NOW)).toMatchObject({ text: 'Test', tone: 'need' });
    expect(flagOf(entry('interview', 1), NOW)).toMatchObject({ tone: 'good' });
    expect(flagOf(entry('applied', 30), NOW)).toMatchObject({ text: '30d quiet', tone: 'quiet' });
    expect(flagOf(entry('applied', 3), NOW)).toBeNull();
    expect(flagOf(entry('applied', null), NOW)).toBeNull();
  });
});

describe('sectionsOf', () => {
  it('splits a lane by how long ago each moved, undated last, empty ones left out', () => {
    const sections = sectionsOf([entry('applied', 2), entry('applied', 10), entry('applied', 90), entry('applied', null)], NOW);
    expect(sections.map((s) => [s.label, s.entries.length])).toEqual([['This week', 1], ['Last two weeks', 1], ['Earlier', 2]]);
  });

  it('dates a card by its newest line, and leaves an undated one blank', () => {
    expect(lastAt(entry('applied', 3))).toBe(ago(3));
    expect(cardDate(entry('applied', null))).toBe('');
  });
});
