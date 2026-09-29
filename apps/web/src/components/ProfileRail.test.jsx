import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileRail from './ProfileRail.jsx';

const ROWS = [{ id: 'profile-basics', label: 'Basics' }, { id: 'profile-experience', label: 'Experience', count: 3 }];

describe('ProfileRail', () => {
  // The name heads the record itself now (see ProfileHero.jsx).
  it('leaves the name to the record and holds only the index and the card', () => {
    render(<ProfileRail rows={ROWS} current="profile-basics" onJump={() => {}} />);
    expect(screen.getByRole('complementary', { name: 'Record index' })).not.toHaveTextContent('Jane Doe');
  });

  it('holds the index with counts and whatever is passed in under it', () => {
    render(
      <ProfileRail rows={ROWS} current="profile-experience" onJump={() => {}}>
        <p>resume card</p>
      </ProfileRail>,
    );
    expect(screen.getByRole('link', { name: 'Experience 3' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByText('resume card')).toBeInTheDocument();
  });
});
