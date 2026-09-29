import { useEffect, useState } from 'react';
import { getDocumentTemplates } from '../api.js';

// The layouts a new document can start from, read once per workspace. A
// failed read is announced by the api layer and leaves the list empty,
// which the picker shows as still loading rather than as no templates.
export function useTemplates() {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    let alive = true;
    getDocumentTemplates().then((list) => alive && setTemplates(list)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return templates;
}
