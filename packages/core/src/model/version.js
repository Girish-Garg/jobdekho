// The version of each model. A row remembers the level model's version its
// estimate came from (retag.js), and a newer one here makes every stored
// posting be estimated again, the way TAGS_VERSION re-tags; a newer section
// model is off until the owner's audit of it passes (audit.js). So a model
// is trained again only after its number here goes up: the training writes
// this number into the weights, a weights file carrying any other is not
// used, and docs/model-card.md records it beside the model's measurements.
export const MODEL_VERSIONS = { level: 1, sections: 2, facts: 1 }
