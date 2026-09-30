import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkillGroupsSection from './SkillGroupsSection.jsx';

describe('SkillGroupsSection', () => {
  it('shows the one-line hint when there are no groups yet', () => {
    render(<SkillGroupsSection groups={[]} onChange={() => {}} />);
    expect(screen.getByText(/group your skills the way a resume would/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Skills 0' })).toBeInTheDocument();
  });

  it('adds a blank group', () => {
    const onChange = vi.fn();
    render(<SkillGroupsSection groups={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }));
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });

  it('renames a group and adds an item to it', () => {
    const onChange = vi.fn();
    const groups = [{ id: '1', name: '', items: [] }];
    render(<SkillGroupsSection groups={groups} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Languages' } });
    expect(onChange).toHaveBeenCalledWith([{ id: '1', name: 'Languages', items: [] }]);

    const tagBox = screen.getByPlaceholderText('add...');
    fireEvent.change(tagBox, { target: { value: 'python' } });
    fireEvent.keyDown(tagBox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith([{ id: '1', name: '', items: ['python'] }]);
  });

  it('removes a group', () => {
    const onChange = vi.fn();
    const groups = [{ id: '1', name: 'Languages', items: [] }];
    render(<SkillGroupsSection groups={groups} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove group' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
