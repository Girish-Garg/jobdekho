// The version of each shipped model. A row remembers the level model's
// version its estimate came from (retag.js), and a newer one here makes
// every stored posting be estimated again, the way TAGS_VERSION re-tags.
// So a model is trained again only after its number here goes up: the
// training writes this number into the weights, a weights file carrying
// any other is not used, and docs/model-card.md records it beside the
// model's measurements.
export const MODEL_VERSIONS = { level: 1, sections: 1 }

export const LEVEL_MODEL_VERSION = MODEL_VERSIONS.level
