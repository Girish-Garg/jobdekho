import SaveBar from './SaveBar.jsx';
import { mergeSave, toSavedFilters } from '../lib/savedFilters.js';

// Makes the current filters the ones the feed opens with. There is no sign
// in, so the note says when they load in the terms that are true here.
export default function SaveDefaultFilters({ filters }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p className="text-xs leading-relaxed text-muted">
        Open JobDekho with these filters every time.
      </p>
      <SaveBar onSave={() => mergeSave(toSavedFilters(filters))} label="Save as my default" weight="quiet" />
    </div>
  );
}
