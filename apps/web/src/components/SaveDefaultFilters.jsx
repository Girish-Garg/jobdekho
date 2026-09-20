import SaveBar from './SaveBar.jsx';
import { mergeSave, toSavedFilters } from '../lib/savedFilters.js';

// Makes the current filter the one that loads on sign-in.
export default function SaveDefaultFilters({ filters }) {
  return (
    <div className="flex flex-col gap-1">
      <SaveBar onSave={() => mergeSave(toSavedFilters(filters))} label="Save as my default" />
      <p className="text-xs leading-relaxed text-muted">
        Loads every time you sign in.
      </p>
    </div>
  );
}
