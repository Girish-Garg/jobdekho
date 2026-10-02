import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Button from './Button.jsx';
import IconButton from './IconButton.jsx';
import Switch from './Switch.jsx';
import Card from './Card.jsx';
import TextInput from './TextInput.jsx';
import TextArea from './TextArea.jsx';
import SearchField from './SearchField.jsx';
import Chip from './Chip.jsx';
import CountBadge from './CountBadge.jsx';
import Eyebrow from './Eyebrow.jsx';
import PageTitle from './PageTitle.jsx';

// Tests run from the repo root or from apps/web (see favicon.test.js).
const root = existsSync(join(process.cwd(), 'apps/web/index.html')) ? join(process.cwd(), 'apps/web') : process.cwd();
const css = ['buttons', 'controls', 'surfaces', 'fields', 'marks']
  .map((name) => readFileSync(join(root, `src/${name}.css`), 'utf8'))
  .join('\n');

describe('Button', () => {
  it('is a plain button, never a submit by accident, in the weight it is given', () => {
    render(<Button variant="primary">Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('btn', 'btn-primary');
    expect(button).not.toHaveClass('btn-sm');
  });

  it('defaults to the quiet weight, takes the small size, and keeps the caller classes and props', () => {
    const onClick = vi.fn();
    render(<Button size="sm" className="w-full" disabled={false} onClick={onClick}>Keep</Button>);
    const button = screen.getByRole('button', { name: 'Keep' });
    expect(button).toHaveClass('btn', 'btn-quiet', 'btn-sm', 'w-full');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('can still submit a form when asked to, and hands its ref through', () => {
    const ref = createRef();
    render(<Button ref={ref} type="submit">Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Send' }));
  });
});

describe('IconButton', () => {
  it('is named by its label, since it has no words of its own', () => {
    render(<IconButton label="Close"><svg /></IconButton>);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('icon-btn', 'icon-btn-sm');
    expect(button).not.toHaveClass('icon-btn-danger', 'icon-btn-outline', 'icon-btn-square');
  });

  it('takes a size, the danger tone, an outline and a square corner', () => {
    const ref = createRef();
    render(<IconButton ref={ref} label="Remove" size="md" tone="danger" outline square className="self-start" />);
    const button = screen.getByRole('button', { name: 'Remove' });
    expect(button).toHaveClass('icon-btn-md', 'icon-btn-danger', 'icon-btn-outline', 'icon-btn-square', 'self-start');
    expect(ref.current).toBe(button);
  });
});

describe('Switch', () => {
  it('says whether it is on, and flips when pressed', () => {
    const onChange = vi.fn();
    render(<Switch on={false} onChange={onChange} aria-label="Refresh on its own" />);
    const toggle = screen.getByRole('switch', { name: 'Refresh on its own' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveClass('switch');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('comes in the small size that fits inside a field', () => {
    render(<Switch on onChange={() => {}} size="sm" aria-label="Still going" />);
    const toggle = screen.getByRole('switch', { name: 'Still going' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveClass('switch', 'switch-sm');
  });
});

describe('Card', () => {
  it('is a panel by default, and takes the element and variant it is given', () => {
    const { container, rerender } = render(<Card>Body</Card>);
    expect(container.firstChild.tagName).toBe('DIV');
    expect(container.firstChild).toHaveClass('card', 'card-panel');
    rerender(<Card as="section" variant="inset" className="p-4" aria-label="Well">Body</Card>);
    const well = screen.getByRole('region', { name: 'Well' });
    expect(well).toHaveClass('card', 'card-inset', 'p-4');
  });

  it('hands its ref through, for a popover that measures itself', () => {
    const ref = createRef();
    render(<Card ref={ref} variant="pop">Menu</Card>);
    expect(ref.current).toHaveClass('card-pop');
  });
});

describe('text fields', () => {
  it('a text input and a text area share one look and pass the rest through', () => {
    const ref = createRef();
    render(
      <>
        <TextInput ref={ref} aria-label="Name" defaultValue="Asha" className="w-full" />
        <TextArea aria-label="Summary" rows={3} />
      </>,
    );
    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveClass('field', 'w-full');
    expect(name).toHaveValue('Asha');
    expect(ref.current).toBe(name);
    expect(screen.getByRole('textbox', { name: 'Summary' })).toHaveClass('field');
  });

  it('a search field is named by its label, not by its placeholder', () => {
    const onChange = vi.fn();
    render(<SearchField label="Search companies" placeholder="Search 1,500 companies" value="" onChange={onChange} className="w-60" />);
    const box = screen.getByRole('textbox', { name: 'Search companies' });
    expect(box).toHaveClass('field-search');
    expect(box.parentElement).toHaveClass('w-60');
    fireEvent.change(box, { target: { value: 'razor' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('marks', () => {
  it('a chip takes a tone, and can be a button when it does something', () => {
    render(
      <>
        <Chip>Internship</Chip>
        <Chip as="button" tone="primary" type="button">New</Chip>
      </>,
    );
    expect(screen.getByText('Internship')).toHaveClass('chip', 'chip-quiet');
    expect(screen.getByRole('button', { name: 'New' })).toHaveClass('chip', 'chip-primary');
  });

  it('a count shows its number, quiet or solid', () => {
    render(
      <>
        <CountBadge n={12} />
        <CountBadge n={2} solid aria-hidden="true" />
      </>,
    );
    expect(screen.getByText('12')).toHaveClass('count');
    expect(screen.getByText('12')).not.toHaveClass('count-solid');
    expect(screen.getByText('2')).toHaveClass('count', 'count-solid');
  });

  it('an eyebrow is muted unless it marks something waiting, and the page title is the h1', () => {
    render(
      <>
        <Eyebrow>Sources</Eyebrow>
        <Eyebrow primary as="h3">Proposed change</Eyebrow>
        <PageTitle>Postings</PageTitle>
      </>,
    );
    expect(screen.getByText('Sources')).toHaveClass('eyebrow');
    expect(screen.getByText('Sources')).not.toHaveClass('text-primary');
    expect(screen.getByRole('heading', { level: 3, name: 'Proposed change' })).toHaveClass('eyebrow', 'text-primary');
    expect(screen.getByRole('heading', { level: 1, name: 'Postings' })).toHaveClass('page-title');
  });
});

// A variant the components can ask for has to exist in the stylesheets, or
// it renders as an unstyled box with no error anywhere.
describe('the stylesheets behind the building blocks', () => {
  it('define every class the components can put on an element', () => {
    const classes = [
      'btn', 'btn-sm', 'btn-primary', 'btn-tint', 'btn-quiet', 'btn-ghost', 'btn-danger',
      'icon-btn', 'icon-btn-xs', 'icon-btn-sm', 'icon-btn-md', 'icon-btn-danger', 'icon-btn-outline', 'icon-btn-square',
      'switch', 'switch-sm', 'switch-knob',
      'card', 'card-panel', 'card-inset', 'card-pop', 'card-list', 'card-rail',
      'field', 'field-search',
      'chip', 'chip-quiet', 'chip-primary', 'chip-applied', 'chip-line',
      'count', 'count-solid', 'eyebrow', 'page-title',
    ];
    for (const name of classes) expect(css, name).toMatch(new RegExp(`\\.${name}(?![\\w-])`));
  });

  // A state outside :where() outweighs a hover: or disabled: utility on the
  // element, so the override every building block promises would lose.
  it('keep every state as light as the class itself', () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const heavy = rules.match(/\.(?:btn|icon-btn|switch)[\w-]*(?::(?:hover|active|disabled|focus)|\[aria-)/g) ?? [];
    expect(heavy).toEqual([]);
  });
});
