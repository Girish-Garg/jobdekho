import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ChatHeader from './ChatHeader.jsx';
import { chatGroups } from '../lib/chatGroups.js';
import { compareChat, generalChat, jobChat } from '../test/fixtures/chats.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none'], present: true, runs: true };
const LIST = [jobChat('pB', { unseen: true }), compareChat('cmp', ['pA', 'pB']), generalChat('g1', 'Which remote jobs pay the most?')];
const layout = (over = {}) => ({ wide: true, pinned: false, togglePinned: vi.fn(), ...over });

function setup(props = {}) {
  const view = props.view ?? jobChat('pA');
  const switcher = {
    groups: chatGroups(LIST, view),
    signalOf: (row) => ({ busy: row.id === 'cmp' ? { label: 'Answering' } : null, unseen: Boolean(row.unseen) }),
    onPick: vi.fn(), onClear: vi.fn(), onDelete: vi.fn(),
  };
  const active = { pinned: false, togglePin: vi.fn(), other: null, pick: vi.fn(), ...props.active };
  const handlers = { onNew: vi.fn(), onClose: vi.fn() };
  render(<ChatHeader view={view} providers={[CLAUDE]} answerer={CLAUDE} signal={null} switcher={switcher} layout={layout()} {...handlers} {...props} active={active} />);
  return { switcher, active, ...handlers };
}
const openSwitcher = () => fireEvent.click(screen.getByRole('button', { name: /switch chats/ }));

describe('ChatHeader', () => {
  it('names the chat on screen, what kind of chat it is, and the CLI that will answer', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Job A Engineer, switch chats' })).toBeInTheDocument();
    expect(screen.getByText('AlphaCo · this job\'s chat')).toBeInTheDocument();
    expect(screen.getByText('Claude Code on this PC')).toBeInTheDocument();
  });

  it('says when it is still looking for a CLI, and when there is none', () => {
    const { unmount } = render(<ChatHeader view={null} providers={undefined} answerer={null} switcher={{}} active={{ other: null }} layout={layout()} />);
    expect(screen.getByText('Looking for an AI CLI on this computer...')).toBeInTheDocument();
    unmount();
    render(<ChatHeader view={null} providers={[]} answerer={null} switcher={{}} active={{ other: null }} layout={layout()} />);
    expect(screen.getByText('No AI CLI found on this computer')).toBeInTheDocument();
  });

  it('opens the switcher on the chat\'s name, grouped, with a dot for an unseen answer and a ring for a running one', () => {
    setup();
    openSwitcher();
    const menu = screen.getByRole('dialog', { name: 'Your chats' });
    expect(within(menu).getAllByRole('heading').map((h) => h.textContent)).toEqual(['This job', 'Other jobs', 'Comparing', 'General']);
    expect(within(menu).getByRole('button', { name: /^Job A Engineer/ })).toHaveAttribute('aria-current', 'true');
    expect(within(menu).getByRole('img', { name: 'New answer' })).toBeInTheDocument();
    expect(within(menu).getByRole('img', { name: 'Answer running' })).toBeInTheDocument();
  });

  it('puts a chat picked from the switcher on screen and closes it; New general chat starts one', () => {
    const { switcher, onNew } = setup();
    openSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /^Which remote jobs pay the most/ }));
    expect(switcher.onPick).toHaveBeenCalledWith('g1');
    expect(screen.queryByRole('dialog', { name: 'Your chats' })).not.toBeInTheDocument();
    openSwitcher();
    fireEvent.click(screen.getByRole('button', { name: 'New general chat' }));
    expect(onNew).toHaveBeenCalled();
  });

  it('deletes a chat from the switcher only once asked, and clears the one on screen only once asked', () => {
    const { switcher } = setup();
    openSwitcher();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Which remote jobs pay the most?' }));
    expect(switcher.onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete it' }));
    expect(switcher.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1' }));
    openSwitcher();
    fireEvent.click(screen.getByRole('button', { name: 'Clear this chat' }));
    expect(switcher.onClear).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear it' }));
    expect(switcher.onClear).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-pA' }));
  });

  it('shows a ring or a dot by the name while another chat runs or has a new answer', () => {
    const { unmount } = render(<ChatHeader view={generalChat('g1')} providers={[]} switcher={{}} active={{ other: null }} layout={layout()} signal="busy" />);
    expect(screen.getByRole('img', { name: 'Another chat is running' })).toBeInTheDocument();
    unmount();
    render(<ChatHeader view={generalChat('g1')} providers={[]} switcher={{}} active={{ other: null }} layout={layout()} signal="unseen" />);
    expect(screen.getByRole('img', { name: 'Another chat has a new answer' })).toBeInTheDocument();
  });

  it('pins the chat on screen, and offers the open job\'s own chat while it stays', () => {
    const other = { type: 'job', item: { id: 'pB', title: 'Job B Analyst', company: 'BetaCo' }, chatId: 'job:pB' };
    const { active } = setup({ view: generalChat('g1', 'Hi'), active: { pinned: true, other } });
    const pin = screen.getByRole('button', { name: 'Keep this chat on screen' });
    expect(pin).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(pin);
    expect(active.togglePin).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open BetaCo\'s chat' }));
    expect(active.pick).toHaveBeenCalledWith('job:pB');
  });

  it('starts a new chat and closes from labelled icon buttons with tooltips', () => {
    const { onNew, onClose } = setup();
    expect(screen.getByRole('button', { name: 'New chat' })).toHaveAttribute('title', 'New chat');
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close the chat' }));
    expect(onNew).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('offers to dock a floating panel and to float a docked one, on a wide window that does not dock it itself', () => {
    const floating = layout();
    const { unmount } = render(<ChatHeader view={null} providers={[]} switcher={{}} active={{ other: null }} layout={floating} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dock beside the page' }));
    expect(floating.togglePinned).toHaveBeenCalled();
    unmount();
    const { unmount: again } = render(<ChatHeader view={null} providers={[]} switcher={{}} active={{ other: null }} layout={layout({ pinned: true })} />);
    expect(screen.getByRole('button', { name: 'Float over the page' })).toBeInTheDocument();
    again();
    render(<ChatHeader view={null} providers={[]} switcher={{}} active={{ other: null }} layout={layout({ pinned: true, docked: true })} />);
    expect(screen.queryByRole('button', { name: /Dock beside the page|Float over/ })).not.toBeInTheDocument();
  });
});
