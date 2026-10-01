import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecommendedNotice from './RecommendedNotice.jsx';

describe('RecommendedNotice', () => {
  it('says the list is really newest-first, not a broken ranking', () => {
    render(<RecommendedNotice onOpenProfile={() => {}} />);
    expect(screen.getByText(/needs? a profile/i)).toBeInTheDocument();
    expect(screen.getByText(/newest postings/i)).toBeInTheDocument();
  });

  // The server ignores minFit with no profile, so when a floor is set the
  // copy has to name the dead filter, and it drops the "newest postings"
  // claim, which would be wrong under any other sort.
  it('names the dead fit filter when a floor is set', () => {
    render(<RecommendedNotice fitFiltered onOpenProfile={() => {}} />);
    expect(screen.getByText(/needs? a profile/i)).toBeInTheDocument();
    expect(screen.getByText(/fit filter/i)).toBeInTheDocument();
    expect(screen.queryByText(/newest postings/i)).not.toBeInTheDocument();
  });

  it('points straight at the profile section', () => {
    const onOpenProfile = vi.fn();
    render(<RecommendedNotice onOpenProfile={onOpenProfile} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set up your profile' }));
    expect(onOpenProfile).toHaveBeenCalled();
  });
});
