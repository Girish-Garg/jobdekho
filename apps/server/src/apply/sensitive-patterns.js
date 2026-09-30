// Fields JobDekho never fills, checked before anything else, fail-closed: a
// field that matches is the person's however it would otherwise have been
// read. Some are secrets (a password, a code), some are the person's to give
// or withhold (identity, self-identification, pay), some are their own
// agreement (consent), and some are facts JobDekho simply does not hold.
// Text is lowercased with _ - . [ ] squashed to spaces.
export const PERSONAL = [
  ['password', /\b(pass ?word|passcode|pwd)\b|पासवर्ड/],
  ['code', /\b(otp|one time (code|password|pin)|verification code|verify code|security code|auth(entication)? code|2fa|mfa|sms code)\b/],
  ['captcha', /\b(captcha|recaptcha|hcaptcha|not a robot|are you (a )?human)\b/],
  ['payment', /\b(card number|credit card|debit card|cvv|cvc|expiry|expiration|upi|ifsc|bank|account number|application fee|registration fee|processing fee|payment)\b/],
  ['identity', /\b(aadhaa?r|adhaar|pan|passport|ssn|social security|national id|uan|voter id|driving licen[cs]e|date of birth|birth ?date|dob|age|father'?s name|mother'?s name|spouse|marital|signature|sign here)\b|आधार|जन्म/],
  ['self-id', /\b(gender|sex|pronouns?|race|racial|ethnic(ity)?|caste|category|religion|disabilit(y|ies)|handicap|veteran|military|sexual orientation|lgbt\w*|transgender|eeo|eeoc)\b|लिंग/],
  ['consent', /\b(i agree|agree|consent|acknowledge|certify|declare|confirm that|terms|privacy|policy|background (check|verification)|bgv|authori[sz]e|accept)\b/],
  ['salary', /\b(salary|ctc|compensation|expected pay|current pay|pay expectation|remuneration|lpa|lakhs? per annum)\b/],
  ['unknown', /\b(notice period|relatives?|family member|previously (been )?(employed|worked)|worked (here|for us|with us)|criminal|convicted|health|medical|references?|referee|visa|sponsor(ship)?|work (authori[sz]ation|permit)|legally (authori[sz]ed|eligible)|citizenship|nationality|how did you (hear|find)|source)\b/],
]

// Consent is about ticking or picking, so it is only read into choices: a
// file input that mentions a privacy policy is still the resume.
export const CHOICE_ONLY = new Set(['consent'])

// Buttons JobDekho never presses, named so the page can be read for what
// step it is on: a submit on the page makes it the final review.
export const SUBMIT_BUTTON = /\b(submit|apply|send (my )?application|finish|complete (my )?application|review and submit)\b/i
export const AUTH_BUTTON = /\b(sign ?in|log ?in|sign ?up|register|create (an )?account|continue with)\b/i

// One sentence per kind, for the checklist.
export const NOTES = {
  password: 'Passwords are yours to type.',
  code: 'A code sent to you: yours to enter.',
  captcha: 'A check that you are human: yours to answer.',
  payment: 'Money details are never filled. Genuine employers do not charge to apply.',
  identity: 'Identity details are yours to give.',
  'self-id': 'About you personally: yours to answer or skip.',
  consent: 'Your own agreement: read it and choose yourself.',
  salary: 'Pay questions are yours to answer.',
  unknown: 'JobDekho does not know this one.',
}
