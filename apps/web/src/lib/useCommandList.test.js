import { describe, it, expect, vi } from 'vitest';
import { buildCommands } from './useCommandList.js';
import { EMPTY_FILTERS } from './savedFilters.js';

const base = (overrides = {}) => ({
  view: 'postings',
  setView: vi.fn(),
  filters: EMPTY_FILTERS,
  setFilters: vi.fn(),
  onOpenHelp: vi.fn(),
  ...overrides,
});

const labels = (commands) => commands.map((c) => c.label);

describe('buildCommands navigation', () => {
  it('omits the view already open', () => {
    const found = buildCommands(base());
    expect(labels(found)).not.toContain('Go to Postings');
    expect(labels(found)).toContain('Go to Profile');
    expect(labels(found)).toContain('Go to Settings');
  });
});

describe('buildCommands sort', () => {
  it('offers the five sorts only on the postings view', () => {
    const onPostings = buildCommands(base());
    expect(labels(onPostings).filter((l) => l.startsWith('Sort:'))).toHaveLength(5);

    const onProfile = buildCommands(base({ view: 'profile' }));
    expect(labels(onProfile).filter((l) => l.startsWith('Sort:'))).toHaveLength(0);
  });
});

describe('buildCommands filters', () => {
  it('offers a command per fit grade, level and status option', () => {
    const found = buildCommands(base());
    expect(labels(found).filter((l) => l.startsWith('Fit:'))).toHaveLength(5);
    expect(labels(found).filter((l) => l.startsWith('Level:'))).toHaveLength(6);
    expect(labels(found).filter((l) => l.startsWith('Status:'))).toHaveLength(5);
  });

  it('replaces the level array rather than appending to it', () => {
    const setFilters = vi.fn();
    const filters = { ...EMPTY_FILTERS, levels: ['entry'] };
    const found = buildCommands(base({ filters, setFilters }));
    found.find((c) => c.label === 'Level: Senior').run();
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ levels: ['senior'] }));
  });

  it('clears every filter through the clear command', () => {
    const setFilters = vi.fn();
    const found = buildCommands(base({ setFilters }));
    found.find((c) => c.id === 'clear-filters').run();
    expect(setFilters).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});

describe('buildCommands help', () => {
  it('wires the help command straight to onOpenHelp', () => {
    const onOpenHelp = vi.fn();
    const found = buildCommands(base({ onOpenHelp }));
    found.find((c) => c.id === 'help').run();
    expect(onOpenHelp).toHaveBeenCalled();
  });
});
