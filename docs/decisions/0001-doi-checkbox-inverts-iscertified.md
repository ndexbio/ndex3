# 0001 — The "reference later" checkbox inverts `isCertified`

Status: accepted (2026-08-27)

## Context

Requesting a DOI has two possible endings, chosen by a single checkbox labelled
"Let me add/modify the reference later."

The API takes a boolean named `isCertified`. The checkbox and the flag read as
near-synonyms but mean opposite things: ticking the box asks the server *not* to
certify yet.

This is carried over from the Angular app, which sent `!editor.isCertified`. The
naming collision caused confusion there and would again.

## Decision

Keep the checkbox as the user-facing control and invert it at the call site:

- unchecked → `isCertified: true` — certified immediately, made PUBLIC, indexed,
  permanently locked
- checked → `isCertified: false` — left pre-certified, visibility preserved, one
  remaining chance to supply the reference

The inversion happens once, in `CreateDOIDialog`, and is commented there.

## Consequences

- A reader skimming the submit handler will misread it unless the comment
  survives. It must not be removed as noise.
- Both branches are covered by `CreateDOIDialog.test.tsx`, which asserts the
  boolean actually sent for each checkbox state. Those tests exist specifically
  to catch an accidental "correction" of the inversion.
- The alternative — relabelling the checkbox to match the flag ("Certify this
  network now") — was rejected because the existing label describes what the
  user gets, not what the API wants, and users already recognise it.
