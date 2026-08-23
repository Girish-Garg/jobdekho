import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecommendedNotice from './RecommendedNotice.jsx';

describe('RecommendedNotice', () => {
  it('says the list is really newest-first, not a broken ranking', () => {
    render(<RecommendedNotice onOpenProfile={() => {}} />);
    expect(screen.getByText(/needs a profile/i)).toBeInTheDocument();
    expect(screen.getByText(/newest postings/i)).toBeInTheDocument();
  });

  it('points straight at the profile section', () => {
    const onOpenProfile = vi.fn();
    render(<RecommendedNotice onOpenProfile={onOpenProfile} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set up your profile' }));
    expect(onOpenProfile).toHaveBeenCalled();
  });
});
