import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApplyToAlerts from './ApplyToAlerts.jsx';

vi.mock('../api.js', () => ({
  applyProfileFilter: vi.fn(async () => ({})),
}));

import { applyProfileFilter } from '../api.js';

beforeEach(() => vi.clearAllMocks());

const start = () => fireEvent.click(screen.getByRole('button', { name: 'Use this for my alerts' }));

describe('ApplyToAlerts', () => {
  it('asks before touching the saved filter, and says what gets overwritten', () => {
    render(<ApplyToAlerts />);
    start();
    expect(applyProfileFilter).not.toHaveBeenCalled();
    expect(screen.getByText(/overwritten/)).toBeInTheDocument();
    expect(screen.getByText(/keywords, levels, degree ceiling and locations/)).toBeInTheDocument();
  });

  it('fires only on the explicit confirm and reports back', async () => {
    render(<ApplyToAlerts />);
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite my filter' }));
    await waitFor(() => expect(applyProfileFilter).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Alerts updated.')).toBeInTheDocument();
  });

  it('backs out on cancel without calling the server', () => {
    render(<ApplyToAlerts />);
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Keep my filter' }));
    expect(applyProfileFilter).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Use this for my alerts' })).toBeInTheDocument();
  });

  it('surfaces the server message when applying fails', async () => {
    applyProfileFilter.mockRejectedValueOnce(Object.assign(new Error('no profile'), { status: 400 }));
    render(<ApplyToAlerts />);
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite my filter' }));
    expect(await screen.findByText('no profile')).toBeInTheDocument();
  });
});
