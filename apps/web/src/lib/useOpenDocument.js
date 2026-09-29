import { useEffect, useState } from 'react';
import { currentOpenDocument, onOpenDocumentChange } from './openDocumentSignal.js';

// Which document the Resume workspace has open, for the chat: its id goes
// with every question asked on that page, and its name sits above the
// conversation so "make it shorter" is never a question about which one.
export function useOpenDocument() {
  const [doc, setDoc] = useState(currentOpenDocument);
  useEffect(() => onOpenDocumentChange(setDoc), []);
  return doc;
}
