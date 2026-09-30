import { send } from './cdp-call.js'

// A page's own "Attach" button opens the operating system's file dialog, on a
// window nobody can see. With interception on, no dialog opens at all: the
// browser reports the chooser here, the panel asks which of the person's
// files, and the answer is set straight on the input the chooser belonged to
// (measured: reported within 5 to 7 ms, and the page's own change handler
// fires). The event only reaches a session that enabled the Page domain
// itself, hence the enable here and not somewhere else.
export async function interceptChoosers(cdp, onChooser) {
  cdp.on('Page.fileChooserOpened', (event) => {
    if (event.backendNodeId) onChooser({ backendNodeId: event.backendNodeId, multiple: event.mode === 'selectMultiple' })
  })
  await send(cdp, 'Page.enable')
  await send(cdp, 'Page.setInterceptFileChooserDialog', { enabled: true })
}

export async function answerChooser(cdp, chooser, path) {
  await send(cdp, 'DOM.setFileInputFiles', { files: [path], backendNodeId: chooser.backendNodeId })
}
