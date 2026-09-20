import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AiVersions from './AiVersions.jsx';

const RECORD = {
  kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: 'z', result: { verdict: 'genuine' }, dropped: false,
  versions: [
    { instruction: '', provider: 'claude', createdAt: 'a', result: { verdict: 'unclear' } },
    { instruction: 'check the recruiter email', provider: 'claude', createdAt: 'b', result: { verdict: 'genuine' } },
  ],
};

describe('AiVersions', () => {
  it('renders nothing for a record with only one version', () => {
    const { container } = render(<AiVersions record={{ ...RECORD, versions: RECORD.versions.slice(0, 1) }} selected={null} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for nothing saved', () => {
    const { container } = render(<AiVersions record={null} selected={null} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('numbers each version and titles it with the instruction that produced it', () => {
    render(<AiVersions record={RECORD} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'v1' })).toHaveAttribute('title', 'First version');
    expect(screen.getByRole('button', { name: 'v2' })).toHaveAttribute('title', 'check the recruiter email');
  });

  it('marks the newest current when nothing is explicitly selected', () => {
    render(<AiVersions record={RECORD} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'v2' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'v1' })).toHaveAttribute('aria-current', 'false');
  });

  it('marks whichever version is explicitly selected as current', () => {
    render(<AiVersions record={RECORD} selected={0} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'v1' })).toHaveAttribute('aria-current', 'true');
  });

  it('reports the index clicked', () => {
    const onSelect = vi.fn();
    render(<AiVersions record={RECORD} selected={null} onSelect={onSelect} />);
    screen.getByRole('button', { name: 'v1' }).click();
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('says the oldest were dropped when the record says so', () => {
    render(<AiVersions record={{ ...RECORD, dropped: true }} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/earlier versions were dropped/)).toBeInTheDocument();
  });

  it('says nothing about dropping when the cap was never reached', () => {
    render(<AiVersions record={RECORD} selected={null} onSelect={vi.fn()} />);
    expect(screen.queryByText(/dropped/)).not.toBeInTheDocument();
  });
});
