# 0003 — `isPreCertified` requires a minted DOI, not any DOI

Status: accepted (2026-08-27)

## Context

The server gates its reference endpoint on `hasDOI && !isCertified`, where
`hasDOI` is literally `ndexdoi is not null`.

That also matches a network whose mint failed and was left at the string
`"Pending"`. Submitting a reference for one of those would be accepted: the
server would store the reference, force the network PUBLIC, index it and set
`certified = true` — leaving a network marked certified and published whose DOI
field reads `"Pending"` and never resolves.

This was found by a test asserting that a stuck network is not offered Add
Reference. The test failed, because the predicate had been written to match the
server exactly.

## Decision

`isPreCertified` requires `isDOIAssigned && !isNetworkCertified` — a real,
minted DOI. A failed mint is not a window in which to add a reference; it is a
failure to cancel and retry.

## Consequences

- **The UI deliberately refuses something the API would accept.** This looks
  like a bug to anyone comparing the two. It is not. Do not "simplify"
  `isPreCertified` to match `hasDOI`.
- `isDOILocked` stays keyed on *any* DOI, matching the server, so a stuck
  network remains locked. The two predicates diverge on purpose — see
  [ADR-0002](./0002-restrictions-key-off-hasdoi.md).
- `network-status.test.ts` asserts a stuck network is not pre-certified. If that
  test ever fails, it is the guard being removed, not the test being wrong.
- The server remains exposed: a direct API call can still certify a stuck
  network. Only the client guards it. Fixing that server-side is open work.
