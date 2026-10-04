import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingChips from './PostingChips.jsx';

describe('PostingChips', () => {
  it('shows the level, the work mode and what the person already did', () => {
    render(<PostingChips posting={{ level: 'mid', workMode: 'remote', status: 'applied' }} />);
    expect(screen.getByText('Mid')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('says a job the board dates today is new, and one only found today says that', () => {
    const { rerender } = render(<PostingChips posting={{ newness: 'new' }} />);
    expect(screen.getByText('New today')).toBeInTheDocument();
    rerender(<PostingChips posting={{ newness: 'found-today' }} />);
    expect(screen.queryByText('New today')).not.toBeInTheDocument();
    expect(screen.getByText('Found today')).toBeInTheDocument();
  });

  it('says on hover and focus what the level and the mode were read from', () => {
    render(<PostingChips posting={{
      level: 'mid', levelTag: { value: 'mid', from: 'text', evidence: 'Asks for 3 to 5 years' },
      workMode: 'remote', workModeTag: { value: 'remote', from: 'board', evidence: 'Location says Remote - India' },
    }} />);
    expect(screen.getByText('Mid')).toHaveAccessibleDescription('Asks for 3 to 5 years');
    expect(screen.getByText('Remote')).toHaveAccessibleDescription('Location says Remote - India');
  });

  it('shows no level chip when the posting does not say its level', () => {
    render(<PostingChips posting={{ level: null, workMode: 'hybrid' }} />);
    expect(screen.queryByText('Mid')).not.toBeInTheDocument();
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
  });

  it('renders nothing when there is nothing to say', () => {
    const { container } = render(<PostingChips posting={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
