import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileSection, { AddControl } from './ProfileSection.jsx';

describe('ProfileSection', () => {
  it('carries the id the index scrolls to and a heading that names the count', () => {
    render(
      <ProfileSection id="profile-experience" title="Experience" count={4} hint="Jobs.">
        <p>rows</p>
      </ProfileSection>,
    );
    expect(document.getElementById('profile-experience')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Experience 4' })).toBeInTheDocument();
    expect(screen.getByText('Jobs.')).toBeInTheDocument();
    expect(screen.getByText('rows')).toBeInTheDocument();
  });

  it('leaves the count off a heading that has none, and the hint off when there is none', () => {
    render(<ProfileSection id="profile-basics" title="Basics" />);
    expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    expect(document.getElementById('profile-basics').querySelector('p')).toBeNull();
  });

  // Same row as the heading, at its far end, so every section adds the same way.
  it('puts the add control on the heading\'s row', () => {
    const onClick = vi.fn();
    render(<ProfileSection id="p" title="Projects" count={0} action={<AddControl label="Add project" onClick={onClick} />} />);
    const button = screen.getByRole('button', { name: 'Add project' });
    expect(button.parentElement).toBe(screen.getByRole('heading').parentElement.parentElement);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});
