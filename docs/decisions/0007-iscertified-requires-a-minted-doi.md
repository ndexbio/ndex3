# 0007 — `isCertified` is only meaningful alongside a minted DOI

Status: accepted (2026-08-27)

## Context

`requestDOI` writes the certification flag **before** the minting service is
called:

```java
setFlag(networkId, "readonly", true);
setDOI(networkId, PENDING);
setFlag(networkId, "certified", isCertified);   // set before minting
```

`mintDOI` then attempts the mint. Its three failure paths reset `doi` to
`"Pending"` — and never clear `certified`.

So a "certify now" request whose mint fails leaves the network with
`doi: "Pending"` and `isCertified: true`: certified according to the flag, with
no resolvable DOI at all.

Reading the flag on its own reported that network as published. In listings it
rendered the trophy — "Published network with DOI" — *and* the failed-mint badge
simultaneously, which is both wrong and self-contradictory.

## Decision

`isNetworkCertified` requires a real, minted DOI as well as the flag:

```ts
isDOIAssigned(network) && network?.isCertified === true
```

`isCertified` is never read directly. A DOI that is absent, empty or `"Pending"`
means the network is not certified, whatever the flag says.

## Consequences

- A failed certify-now request now reads only as a failed mint. The trophy is
  gone, `isPreCertified` stays false — there is no DOI to attach a reference to —
  and Cancel DOI is offered, which is the actual remedy.
- `isDOILocked` still returns true for it, so the network stays locked in the UI
  exactly as the server keeps it locked.
- The rule generalises: **no predicate reads one DOI field in isolation.** `doi`
  says whether an identifier exists and whether it resolves; `isCertified` only
  qualifies a `doi` that does.
- Anything outside `network-status.ts` reading `isCertified` directly reintroduces
  this bug. `DetailsPanel` was doing so and was moved onto the predicates.
