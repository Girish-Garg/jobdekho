import { send } from './cdp-call.js'
import { fieldElement, fileNames } from './page/fill-text.js'

// Attaches a file straight to the page's file input, hidden or not, the way
// a chooser would have: no operating-system dialog opens, and the page gets
// its usual change event. Checked by the name the input now holds.
export async function setFile({ cdp, world }, fid, path, name) {
  const element = await world.call(fieldElement, [fid], false)
  if (!element?.objectId) return 'failed'
  await send(cdp, 'DOM.setFileInputFiles', { files: [path], objectId: element.objectId })
  const names = await world.call(fileNames, [fid])
  return names.includes(name) ? 'attached' : 'failed'
}
