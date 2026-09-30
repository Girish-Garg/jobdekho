import { CHOICES, applyTheme, readChoice, writeChoice } from './theme.js';
import { EMPTY_FILTERS } from './savedFilters.js';
import { LEVEL_OPTIONS, STATUS_OPTIONS } from './taxonomy.js';
import { FIT_RANGES, fitFloorLabel } from './ranges.js';

const SORTS = [
  ['match', 'Best fit'],
  ['newest', 'Newest posted'],
  ['oldest', 'Oldest posted'],
  ['added', 'Recently added'],
  ['company', 'Company A-Z'],
];

const VIEWS = [
  ['postings', 'Postings'],
  ['profile', 'Profile'],
  ['settings', 'Settings'],
];

// Cycles the same three choices ThemeToggle does, without importing that
// component: the palette runs headless, so it drives lib/theme.js directly
// rather than clicking a button that is not on screen.
function cycleTheme() {
  const next = CHOICES[(CHOICES.indexOf(readChoice()) + 1) % CHOICES.length];
  writeChoice(next);
  applyTheme(next);
}

// Every action the palette can run, rebuilt from the live chrome state each
// time it opens.
export function buildCommands({ view, setView, filters, setFilters, setSort, onOpenHelp }) {
  const commands = [];

  for (const [value, label] of VIEWS) {
    if (value === view) continue;
    commands.push({ id: `go-${value}`, label: `Go to ${label}`, category: 'Navigate', run: () => setView(value) });
  }

  if (view === 'postings') {
    for (const [value, label] of SORTS) {
      commands.push({
        id: `sort-${value}`,
        label: `Sort: ${label}`,
        category: 'Sort',
        run: () => setSort?.(value),
      });
    }
  }

  for (const [value] of FIT_RANGES) {
    commands.push({
      id: `fit-${value || 'any'}`,
      label: `Fit: ${value ? fitFloorLabel(value) : 'any grade'}`,
      category: 'Filter',
      run: () => setFilters({ ...filters, minFit: value }),
    });
  }

  for (const [value, label] of LEVEL_OPTIONS) {
    commands.push({
      id: `level-${value}`,
      label: `Level: ${label}`,
      category: 'Filter',
      run: () => setFilters({ ...filters, levels: [value] }),
    });
  }

  for (const [value, label] of STATUS_OPTIONS) {
    commands.push({
      id: `status-${value || 'all'}`,
      label: `Status: ${label}`,
      category: 'Filter',
      run: () => setFilters({ ...filters, status: value }),
    });
  }

  commands.push({ id: 'theme', label: 'Toggle theme', category: 'Theme', run: cycleTheme });
  commands.push({
    id: 'clear-filters',
    label: 'Clear all filters',
    category: 'Filter',
    run: () => setFilters({ ...EMPTY_FILTERS }),
  });
  commands.push({ id: 'help', label: 'Show keyboard shortcuts', category: 'Help', run: onOpenHelp });

  return commands;
}
