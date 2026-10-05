import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// One Settings card that cannot be drawn, among stand-ins for the others,
// so nothing here reaches the server.
vi.mock('./AdzunaCard.jsx', () => ({ default: () => { throw new TypeError('the card broke'); } }));
vi.mock('./SetupCard.jsx', () => ({ default: () => <p>Setup card</p> }));
vi.mock('./SettingsAiCard.jsx', () => ({ default: () => <p>AI card</p> }));
vi.mock('./RefreshSettingsCard.jsx', () => ({ default: () => <p>Refresh card</p> }));
vi.mock('./BlockedCompaniesCard.jsx', () => ({ default: () => <p>Blocked card</p> }));
vi.mock('./YourDataCard.jsx', () => ({ default: () => <p>Data card</p> }));
vi.mock('./AboutCard.jsx', () => ({ default: () => <p>About card</p> }));
vi.mock('./ThemeChoice.jsx', () => ({ default: () => <p>Theme choice</p> }));
vi.mock('./EffectsChoice.jsx', () => ({ default: () => <p>Effects choice</p> }));

import SettingsView from './SettingsView.jsx';

let quiet;
beforeEach(() => { quiet = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { quiet.mockRestore(); });

describe('a Settings card that cannot be drawn', () => {
  it('stays in its place under its own name, and the other cards work', () => {
    render(<SettingsView />);
    const card = screen.getByRole('region', { name: 'Adzuna' });
    expect(card).toHaveTextContent('This card could not be shown. The rest of Settings still works.');
    expect(card.closest('#settings-adzuna')).not.toBeNull();
    for (const other of ['Setup card', 'AI card', 'Refresh card', 'Blocked card', 'Data card', 'About card', 'Theme choice']) {
      expect(screen.getByText(other)).toBeInTheDocument();
    }
  });
});
