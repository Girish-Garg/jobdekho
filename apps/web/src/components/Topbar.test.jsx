import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Topbar from './Topbar.jsx';

vi.mock('../api.js', () => ({
  logout: vi.fn(async () => {}),
}));

import { logout } from '../api.js';

beforeEach(() => vi.clearAllMocks());

describe('Topbar', () => {
  it('renders user initial and Log out button', () => {
    render(<Topbar user={{ email: 'alice@example.com' }} onLogout={() => {}} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('calls logout() and onLogout when the button is clicked', async () => {
    const onLogout = vi.fn();
    render(<Topbar user={{ email: 'bob@example.com' }} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(logout).toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalled();
  });
});
