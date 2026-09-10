import { resolve } from 'node:path'

// Where every file the store owns lives. Relative to the working directory by
// default, so `npm start` and `npm run scrape` from the repo root share one
// corpus without either being told where it is; the variable is for running
// from somewhere else, or for keeping the data on another drive.
export const DATA_DIR_ENV = 'JOBDEKHO_DATA_DIR'
export const DEFAULT_DATA_DIR = 'data'

export function resolveDataDir(dir, env = process.env) {
  return resolve(dir || env[DATA_DIR_ENV] || DEFAULT_DATA_DIR)
}
