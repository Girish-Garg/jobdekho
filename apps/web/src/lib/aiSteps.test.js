import { describe, it, expect } from 'vitest';
import { aiSteps, elapsedText } from './aiSteps.js';

const start = { event: 'start', provider: 'agy' };
const stage = (name) => ({ event: 'progress', stage: name });
const states = (steps) => steps.map((step) => `${step.key}:${step.state}`);

describe('aiSteps', () => {
  it('starts on the hand-over, with the work and the write-up still to come', () => {
    expect(states(aiSteps([start], { label: 'Antigravity' }))).toEqual(['send:current', 'work:next', 'write:next']);
    expect(aiSteps([start], { label: 'Antigravity' })[0].text).toBe('Sent to Antigravity');
  });

  it('moves to the work once handed over, in the caller\'s own word for it', () => {
    const steps = aiSteps([start, stage('send'), stage('wait')], { label: 'Claude Code', doing: 'checking the posting' });
    expect(states(steps)).toEqual(['send:done', 'work:current', 'write:next']);
    expect(steps[1].text).toBe('Checking the posting');
  });

  it('adds the web only once the chat has gone there, and finishes on the write-up', () => {
    const toWeb = [start, stage('send'), stage('reply'), stage('web'), start, stage('send'), stage('wait')];
    expect(states(aiSteps(toWeb))).toEqual(['send:done', 'work:done', 'web:current', 'write:next']);
    expect(states(aiSteps([...toWeb, stage('reply')]))).toEqual(['send:done', 'work:done', 'web:done', 'write:current']);
  });

  it('counts the steps before the web as done once the chat is there, even without their events', () => {
    expect(states(aiSteps([start, stage('web')]))).toEqual(['send:done', 'work:done', 'web:current', 'write:next']);
  });

  it('writes up a plain answer once it is back', () => {
    expect(states(aiSteps([start, stage('send'), stage('reply')]))).toEqual(['send:done', 'work:done', 'write:current']);
  });
});

describe('elapsedText', () => {
  it('counts seconds, then minutes and seconds', () => {
    expect(elapsedText(0)).toBe('0s');
    expect(elapsedText(59999)).toBe('59s');
    expect(elapsedText(65000)).toBe('1:05');
    expect(elapsedText(-5)).toBe('0s');
  });
});
