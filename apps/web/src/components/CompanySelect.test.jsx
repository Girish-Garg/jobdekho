import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import CompanySelect from './CompanySelect.jsx';
import { EMPTY_FILTERS } from '../lib/savedFilters.js';
import { getCompanies } from '../api.js';

vi.mock('../api.js', () => ({ getCompanies: vi.fn() }));

// As the server sends it (see the store's companies.js): one row per
// employer, most jobs first, each naming the picks it stands for.
const LIST = [
  { name: 'Bosch Group', count: 529, picked: [] },
  { name: 'Phonepe', count: 59, picked: [] },
  { name: 'Motorola', count: 12, picked: [] },
  { name: 'Ola', count: 3, picked: [] },
];

beforeEach(() => {
  vi.clearAllMocks();
  getCompanies.mockResolvedValue(LIST);
});

// Controlled, so the tests drive it through a holder that keeps the filters.
function setup(start = {}) {
  const onChange = vi.fn();
  function Harness() {
    const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...start });
    return <CompanySelect filters={filters} onChange={(next) => { onChange(next); setFilters({ ...filters, companies: next }); }} />;
  }
  render(<Harness />);
  return { onChange };
}

const open = async (name = 'Company') => {
  fireEvent.click(screen.getByRole('button', { name }));
  await screen.findByRole('checkbox', { name: /Bosch Group/ });
};

describe('CompanySelect', () => {
  it('reads nothing until it is opened, then counts under the feed\'s own filters', async () => {
    setup({ levels: ['internship'] });
    expect(getCompanies).not.toHaveBeenCalled();
    await open();
    expect(getCompanies).toHaveBeenCalledWith(expect.objectContaining({ levels: 'internship', companies: '' }));
    expect(screen.getByRole('checkbox', { name: /Phonepe/ }).closest('label')).toHaveTextContent('59');
    expect(screen.getByRole('textbox', { name: 'Search companies' })).toHaveAttribute('placeholder', 'Search 4 companies');
  });

  it('picks one, names it on the trigger, then counts several', async () => {
    const { onChange } = setup();
    await open();
    fireEvent.click(screen.getByRole('checkbox', { name: /Phonepe/ }));
    expect(onChange).toHaveBeenLastCalledWith(['Phonepe']);
    expect(screen.getByRole('button', { name: 'Company: Phonepe' })).toHaveTextContent('Phonepe');
    fireEvent.click(screen.getByRole('checkbox', { name: /Ola/ }));
    expect(screen.getByRole('button', { name: 'Company: Phonepe, Ola' })).toHaveTextContent('2 companies');
    // A tick changes no count, so it reads nothing again.
    expect(getCompanies).toHaveBeenCalledTimes(1);
  });

  it('finds a name that starts with what was typed first, and Enter picks it', async () => {
    const { onChange } = setup();
    await open();
    const box = screen.getByRole('textbox', { name: 'Search companies' });
    fireEvent.change(box, { target: { value: 'ola' } });
    const names = screen.getAllByRole('checkbox').map((el) => el.closest('label').textContent);
    expect(names).toEqual(['Ola3', 'Motorola12']);
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Ola']);
    expect(box).toHaveValue('');
  });

  // Picked in the job pane as the posting spells it; the menu's row is the
  // same employer, so it shows ticked, and unticking takes that pick away.
  it('ticks a row for a pick in another spelling, and unticks it', async () => {
    getCompanies.mockResolvedValue([{ ...LIST[1], picked: ['PHONEPE LIMITED'] }, LIST[0]]);
    const { onChange } = setup({ companies: ['PHONEPE LIMITED'] });
    await open('Company: PHONEPE LIMITED');
    expect(getCompanies).toHaveBeenCalledWith(expect.objectContaining({ companies: 'PHONEPE LIMITED' }));
    const row = screen.getByRole('checkbox', { name: /Phonepe/ });
    expect(row).toBeChecked();
    fireEvent.click(row);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('clears every pick at once', async () => {
    const { onChange } = setup({ companies: ['Ola', 'Phonepe'] });
    await open('Company: Ola, Phonepe');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('says what it does not show, and when it could not read the list', async () => {
    getCompanies.mockResolvedValue(Array.from({ length: 60 }, (_, i) => ({ name: `Company ${i}`, count: 60 - i, picked: [] })));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Company' }));
    expect(await screen.findByText('The 50 with the most jobs. Search for the other 10.')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(50);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search companies' }), { target: { value: 'zzz' } });
    expect(screen.getByText('No company matches that.')).toBeInTheDocument();
  });

  it('says so in place when the list does not come', async () => {
    getCompanies.mockRejectedValue(new Error('down'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Company' }));
    await waitFor(() => expect(screen.getByText(/Could not read the companies/)).toBeInTheDocument());
    expect(within(screen.getByRole('list')).queryAllByRole('checkbox')).toHaveLength(0);
  });
});
