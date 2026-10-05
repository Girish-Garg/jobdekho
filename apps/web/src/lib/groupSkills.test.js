import { describe, it, expect } from 'vitest';
import { groupSkillsMissing, MAX_SKILLS } from './groupSkills.js';
import { MAX_SKILLS as SERVER_KEEPS } from '@jobdekho/core/profile.js';

// The form stops where the server's save would cut: kept apart, the two
// drifted, and a skill the field let through vanished on save.
describe('the web copy of the Best fit cap', () => {
  it('is the number the server keeps', () => {
    expect(MAX_SKILLS).toBe(SERVER_KEEPS);
  });
});

describe('groupSkillsMissing', () => {
  const groups = [{ name: 'Web', items: ['React', 'Node.js', 'react'] }, { name: 'Data', items: ['SQL', 'Node.js', ' '] }];

  it('names the group skills Best fit lacks, in the groups order, one of each', () => {
    expect(groupSkillsMissing(['node.js'], groups)).toEqual(['React', 'SQL']);
  });

  it('names none when Best fit has them all, or there are no groups', () => {
    expect(groupSkillsMissing(['React', 'Node.js', 'SQL'], groups)).toEqual([]);
    expect(groupSkillsMissing(['React'], undefined)).toEqual([]);
  });
});
