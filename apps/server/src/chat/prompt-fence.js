// Text a prompt hands the model as data, between markers of its own. A text
// that held its own closing marker could end its fence early and put its
// own words outside it, so that marker never survives inside.
export const fence = (open, close, value) => `<<<${open}\n${String(value).split(`${close}>>>`).join('')}\n${close}>>>`
