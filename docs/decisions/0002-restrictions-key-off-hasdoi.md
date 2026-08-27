# 0002 — DOI restrictions key off "has any DOI", not "is certified"

Status: accepted (2026-08-27)

## Context

A network with a DOI must not have its properties edited, its read-only flag
removed, its visibility changed, or be deleted. The obvious predicate is
"is certified", since certification is the permanent, published state.

That is wrong. The server locks a network the moment a request is filed —
`requestDOI` sets the read-only flag before the minting service is called — and
the system-property endpoint refuses everything but `showcase` whenever
`hasDOI` is true, where `hasDOI` is simply "a DOI value is present". That
includes a pre-certified network and one stuck by a failed mint.

Before this decision the UI gated on `hasValidDOI`, which returns `false` for a
network stuck at `"Pending"`. The restrictions still appeared to work, but only
because those networks are also read-only and the UI happened to check
read-only too. The correctness was accidental, and the tooltips blamed
read-only — telling the user to turn off a flag they are not permitted to turn
off.

## Decision

Introduce `isDOILocked` — true when the network has any DOI value, minted or
stuck — and gate every restriction on it. It mirrors the server's `hasDOI`
exactly, so the UI blocks precisely what the API blocks.

`isCertified` is used only for the published badge. `isPreCertified` remains the
gate for Add Reference.

## Consequences

- Behaviour barely changes, but correctness no longer depends on the coincidence
  that a DOI implies read-only. If that ever stopped holding, the gates would
  still be right.
- Tooltips can name the real reason, which is actionable where "read-only" was
  actively misleading.
- Sharing with individual users is deliberately **not** restricted; only
  visibility is. See docs/doi-certification.md.
