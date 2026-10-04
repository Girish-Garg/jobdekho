import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostingsHeader from './PostingsHeader.jsx';

describe('PostingsHeader', () => {
  // One company picked makes the feed its page, with the way back beside it.
  it('titles the feed with the one company picked, and goes back to every company', () => {
    const onAllCompanies = vi.fn();
    render(<PostingsHeader shown={12} company="Razorpay" onAllCompanies={onAllCompanies} />);
    expect(screen.getByRole('heading', { name: 'Razorpay' })).toBeInTheDocument();
    expect(screen.getByText('12 postings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All companies' }));
    expect(onAllCompanies).toHaveBeenCalled();
  });

  it('is Postings, with no way back, when no single company is picked', () => {
    render(<PostingsHeader shown={12} />);
    expect(screen.getByRole('heading', { name: 'Postings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All companies' })).not.toBeInTheDocument();
  });

  // The counts are the whole match's, from the server, not the loaded page.
  // New today is the board's own date within a day; found today is first
  // found today but posted earlier, counted apart and quietly.
  it('says how many of the matching postings are loaded, how many are new today and how many found today', () => {
    render(<PostingsHeader shown={100} total={1234} fresh={{ posted: 37, found: 1200 }} />);
    expect(screen.getByText('100 of 1,234 shown')).toBeInTheDocument();
    expect(screen.getByText(/37 new today/)).toHaveClass('text-primary');
    expect(screen.getByText(/1,200 found today/)).not.toHaveClass('text-primary');
  });

  it('just counts the postings once all of them are loaded', () => {
    render(<PostingsHeader shown={12} total={12} fresh={{ posted: 3, found: 0 }} />);
    expect(screen.getByText('12 postings')).toBeInTheDocument();
    expect(screen.queryByText(/found today/)).not.toBeInTheDocument();
  });

  it('leaves the fresh count out entirely when nothing is new', () => {
    const { container } = render(<PostingsHeader shown={12} fresh={{ posted: 0, found: 0 }} />);
    expect(screen.queryByText(/new today/)).not.toBeInTheDocument();
    expect(container.querySelector('.text-primary')).toBeNull();
  });
});
