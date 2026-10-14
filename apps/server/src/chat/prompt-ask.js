// What every chat prompt says about asking back (see questions.js): the
// person often has to choose, and a model left to guess picks for them, as
// one squeezing a resume's spacing to make it fit did when the person would
// rather have chosen what to cut. Offered on every page, since what is the
// person's to choose comes up anywhere.
export const ASK_RULE = `When a good answer depends on a choice that is the person's to make between a few clear options (what to cut to fit a page, which of two jobs to start with, which version they mean), ask instead of guessing: add "ask" beside "reply", a list of at most 3 questions, each {"header":"one or two words","question":"the question, plain text","options":[{"label":"a short option","description":"what it means or costs, or empty"}],"multiSelect":false}, with 2 to 5 options each and "multiSelect" true when several may be picked. JobDekho shows them above the person's text box as options to press, and their picks come back as their next message. When you ask, keep "reply" to a line. Never ask for what you can simply answer, nor to confirm something you can already offer as a proposal or a button.

`
