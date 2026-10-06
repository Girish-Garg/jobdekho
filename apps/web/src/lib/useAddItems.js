import { useEffect, useState } from 'react';
import { getPostingsPage, listDocuments } from '../api.js';
import { feedQuery } from './feedQuery.js';
import { useDebounced } from './useDebounced.js';
import { recentJobs } from './openedLately.js';

// What "+ Add" can offer, read while its picker is open: jobs, the ones
// opened lately first and then the feed under its own filters searched by
// what is typed, and the person's documents. Whatever the chat already
// holds is left out, since adding it again would change nothing.
const SHOWN = 8;

const matches = (needle) => (job) => !needle || `${job.title} ${job.company}`.toLowerCase().includes(needle.toLowerCase());

export function useAddItems({ open, query, filters, held }) {
  const [found, setFound] = useState([]);
  const [docs, setDocs] = useState(undefined);
  const needle = useDebounced(query.trim(), 250);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    listDocuments().then((list) => alive && setDocs(list ?? [])).catch(() => alive && setDocs([]));
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    setFound([]);
    if (!open || !needle) return undefined;
    let alive = true;
    getPostingsPage({ ...feedQuery(filters ?? {}, needle), limit: SHOWN })
      .then((page) => alive && setFound(page?.postings ?? []))
      .catch(() => alive && setFound([]));
    return () => { alive = false; };
  }, [open, needle]); // eslint-disable-line react-hooks/exhaustive-deps

  const fresh = (job) => !held.jobs.includes(job.id);
  const recent = recentJobs().filter(fresh).filter(matches(needle));
  return {
    recent,
    found: found.filter(fresh).filter((job) => !recent.some((seen) => seen.id === job.id)),
    documents: (docs ?? []).filter((doc) => !held.documents.includes(doc.id)),
    reading: docs === undefined,
  };
}
