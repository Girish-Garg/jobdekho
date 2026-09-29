import { describe, it, expect } from 'vitest';
import { chatBlocks, inlineSpans } from './chatText.js';

const plain = (text) => [{ text, bold: false }];

describe('inlineSpans', () => {
  it('keeps text with no markup as one plain span', () => {
    expect(inlineSpans('Two of these are remote.')).toEqual(plain('Two of these are remote.'));
  });

  it('turns **bold** into a bold span, keeping the text around it', () => {
    expect(inlineSpans('Start with **PhonePe**, then **Razorpay**.')).toEqual([
      { text: 'Start with ', bold: false },
      { text: 'PhonePe', bold: true },
      { text: ', then ', bold: false },
      { text: 'Razorpay', bold: true },
      { text: '.', bold: false },
    ]);
  });

  it('leaves an unclosed pair of stars as the characters they are', () => {
    expect(inlineSpans('5 ** 2 is not bold')).toEqual(plain('5 ** 2 is not bold'));
  });
});

describe('chatBlocks', () => {
  it('splits paragraphs on blank lines and keeps single line breaks inside one', () => {
    expect(chatBlocks('First line\nsame paragraph\n\nSecond paragraph')).toEqual([
      { type: 'p', lines: [plain('First line'), plain('same paragraph')] },
      { type: 'p', lines: [plain('Second paragraph')] },
    ]);
  });

  it('reads -, * and the bullet character as one list, and the prose after it as a paragraph', () => {
    const blocks = chatBlocks('Three fit:\n- PhonePe\n* Razorpay\n• Zerodha\nStart with the first.');
    expect(blocks).toEqual([
      { type: 'p', lines: [plain('Three fit:')] },
      { type: 'ul', items: [plain('PhonePe'), plain('Razorpay'), plain('Zerodha')] },
      { type: 'p', lines: [plain('Start with the first.')] },
    ]);
  });

  it('joins an indented line to the list item above it', () => {
    expect(chatBlocks('- A long point\n  that wraps')).toEqual([{ type: 'ul', items: [plain('A long point that wraps')] }]);
  });

  it('reads numbered lines as an ordered list that keeps its first number', () => {
    expect(chatBlocks('3. Third\n4) Fourth')).toEqual([{ type: 'ol', start: 3, items: [plain('Third'), plain('Fourth')] }]);
  });

  it('starts a new list after a blank line or a change of kind', () => {
    const types = chatBlocks('- a\n\n- b\n1. c').map((block) => block.type);
    expect(types).toEqual(['ul', 'ul', 'ol']);
  });

  it('bolds inside list items too', () => {
    expect(chatBlocks('- **IPO** filed')[0].items[0]).toEqual([{ text: 'IPO', bold: true }, { text: ' filed', bold: false }]);
  });

  it('keeps a dash with no space after it as text, not a bullet', () => {
    expect(chatBlocks('-5% since last year')).toEqual([{ type: 'p', lines: [plain('-5% since last year')] }]);
  });

  it('handles Windows line endings, nothing at all, and markup as plain characters', () => {
    expect(chatBlocks('a\r\n\r\nb').map((block) => block.type)).toEqual(['p', 'p']);
    expect(chatBlocks('')).toEqual([]);
    expect(chatBlocks(null)).toEqual([]);
    expect(chatBlocks('<b>hi</b>')).toEqual([{ type: 'p', lines: [plain('<b>hi</b>')] }]);
  });
});
