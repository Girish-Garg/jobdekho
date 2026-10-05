import { describe, it, expect } from 'vitest';
import { groupSkillsMissing } from './groupSkills.js';

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
