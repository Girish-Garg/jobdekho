import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileRail from './ProfileRail.jsx';

const ROWS = [{ id: 'profile-basics', label: 'Basics' }, { id: 'profile-experience', label: 'Experience', count: 3 }];
const BASICS = { name: 'Jane Doe', headline: 'Backend engineer', email: '', phone: '', location: '', links: {} };

describe('ProfileRail', () => {
  it('heads the rail with the name and headline from basics', () => {
    render(<ProfileRail basics={BASICS} rows={ROWS} current="profile-basics" onJump={() => {}} />);
    const rail = screen.getByRole('complementary', { name: 'Record index' });
    expect(rail).toHaveTextContent('Jane Doe');
    expect(rail).toHaveTextContent('Backend engineer');
  });

  it('stands in a placeholder until a name is typed, and no headline line at all', () => {
    render(<ProfileRail basics={{ ...BASICS, name: '', headline: '' }} rows={ROWS} current="profile-basics" onJump={() => {}} />);
    expect(screen.getByText('Your name')).toBeInTheDocument();
    expect(screen.queryByText('Backend engineer')).not.toBeInTheDocument();
  });

  it('holds the index with counts and whatever is passed in under it', () => {
    render(
      <ProfileRail basics={BASICS} rows={ROWS} current="profile-experience" onJump={() => {}}>
        <p>resume card</p>
      </ProfileRail>,
    );
    expect(screen.getByRole('link', { name: 'Experience 3' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByText('resume card')).toBeInTheDocument();
  });
});
