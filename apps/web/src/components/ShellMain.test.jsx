import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('../api.js', () => ({
  listDocuments: vi.fn(async () => []),
  getDocumentTemplates: vi.fn(async () => []),
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

import ShellMain from './ShellMain.jsx';

// Tests run from the repo root or from apps/web (see favicon.test.js).
const root = existsSync(join(process.cwd(), 'apps/web/index.html')) ? join(process.cwd(), 'apps/web') : process.cwd();

// The Resume workspace is the heaviest page and never the first screen, so
// its code arrives the first time it is opened; bundled in, it took the
// app's one script past the size the build warns at.
describe('ShellMain and the Resume page', () => {
  it('fetches the workspace on first opening it, saying so meanwhile, then shows it', async () => {
    render(<ShellMain view="resume" setView={() => {}} feed={{}} />);
    expect(screen.getByText('Loading your documents...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Your resumes and cover letters' })).toBeInTheDocument();
  });

  // A static import anywhere in the app pulls it back into the main chunk.
  it('is imported nowhere but lazily', () => {
    const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory()
      ? files(join(dir, entry.name))
      : /\.jsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [join(dir, entry.name)] : []));
    const statics = files(join(root, 'src'))
      .filter((file) => /^import[^;]*from '[./]*(?:components\/)?ResumeWorkspace\.jsx'/m.test(readFileSync(file, 'utf8')));
    expect(statics).toEqual([]);
    expect(readFileSync(join(root, 'src/components/ShellMain.jsx'), 'utf8')).toMatch(/lazy\(\(\) => import\('\.\/ResumeWorkspace\.jsx'\)\)/);
  });
});
