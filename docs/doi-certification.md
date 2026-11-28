---
status: current
last-verified: 2026-08-27
applies-to: ndex-rest 3.0.6, @js4cytoscape/ndex-client 0.8.1
supersedes: docs/request-doi-feature.md
---

# DOI Certification

Why the DOI feature is shaped the way it is. For *what the code does*, read the
TSDoc on the functions named below; for *how it behaves*, read
`test/playwright/add-doi-reference.spec.ts` and `cancel-doi-request.spec.ts`.
Decisions and their rationale live in [decisions/](./decisions/).

## The model

A network moves through three states, described by two fields — `doi` and
`isCertified` — plus one failure state.

| State | `doi` | `isCertified` | Meaning |
| --- | --- | --- | --- |
| Unrestricted | absent | `false` | No DOI has been requested |
| Pre-certified | minted | `false` | Published identifier exists; the reference is still owed |
| Certified | minted | `true` | PUBLIC, indexed, permanently locked |
| **Mint failed** | `"Pending"` | either | Locked, and stuck — see below |

Requesting a DOI mints it **synchronously**: a successful request returns with a
real identifier already assigned. Whether it lands in *pre-certified* or
*certified* depends on one checkbox — "Let me add/modify the reference later." —
whose value is **inverted** on the wire ([ADR-0001](./decisions/0001-doi-checkbox-inverts-iscertified.md)).

Two consequences that are easy to get wrong:

- **A minted DOI does not mean certified.** A DOI can be issued while the
  network is still pre-certified and, if it was private, still private.
- **Certified always means PUBLIC.** Both paths that set `certified` also force
  visibility, and that is irreversible — see *Restrictions*.

## Failure is a state, not an error toast

Minting runs inside the request that starts it. When it fails — the network has
no `author` property, it is PRIVATE with no enabled access key, or the DOI
service is unreachable — the server does **not** roll back. It leaves the
network read-only with `doi` set to the string `"Pending"`, and because that
counts as already having a DOI, it refuses any further request.

Cancelling is the only exit. It clears the DOI, the certification flag and the
read-only flag, returning the network to normal so the cause can be fixed and
the request retried. The server's own error text says as much.

This is why `CancelDOIDialog` is written as a recovery action rather than a
destructive one, and why a stuck network is marked distinctly in listings
instead of looking like an ordinary read-only network the user could unlock.

## Restrictions

From the moment a request is filed — including a network stuck by a failed mint
— the network is locked. The server enforces this two ways: directly, by
refusing every system property except `showcase` while `hasDOI` is true; and
transitively, because the request sets the read-only flag and the property,
delete and visibility endpoints all refuse read-only networks.

The UI mirrors the server's own predicate rather than inventing one
([ADR-0002](./decisions/0002-restrictions-key-off-hasdoi.md)). Sharing with
individual users stays available throughout; only visibility is frozen.

Visibility deserves its own note. A DOI's target URL is registered with the
minting service **once** and never revisited, and a certified network is minted
PUBLIC with no access key in that URL. Making it private afterwards would strand
a published citation on a network readers cannot open, unrepairably. That is
guarded server-side as of ndex-rest 3.0.6.

## Where the logic lives

Everything reads through one module. No component inspects `doi` or
`isCertified` directly.

- **`src/lib/utils/network-status.ts`** — the predicates. `isDOILocked` for
  restrictions, `isPreCertified` for Add Reference, `isDOIPending` for a failed
  mint, `isNetworkCertified` for the published badge. All are network-only by
  construction: folders and shortcuts return `false` from every one.
- **`src/hooks/use-network-operation.ts`** — `createNetworkDOI`,
  `updateNetworkReference`, `cancelNetworkDOI`. Each refreshes the network and
  its parent folder listing, because every one of them changes lock state.
- **`src/app/my-account/_components/`** — `CreateDOIDialog`,
  `AddReferenceDialog`, `CancelDOIDialog`. All three are opened through
  `DialogContext` so they outlive the dropdown that triggered them, and share
  `components/shared/DialogShell.tsx` for their chrome.

Restrictions gate on `isDOILocked` throughout: Edit Properties, Move to Trash,
Request DOI, the read-only toggle, and the visibility control in `ShareDialog`.
Tooltips name the DOI rather than read-only — a locked network is also read-only,
and blaming that invites the user to turn off a flag they are not allowed to.

`isPreCertified` is deliberately **stricter than the server**
([ADR-0003](./decisions/0003-precertified-requires-minted-doi.md)). Do not
"simplify" it to match `hasDOI`.

## Reading DOI state from a listing

`doi` is lowercase and top-level in every response. `isCertified` is top-level
on network summaries and on listings from ndex-rest 3.0.6 onward, but older
deployments omit it from folder and home listings and return it under
`attributes` in search results.

So **treat an absent `isCertified` as *unknown*, never as *not certified***.
Reading absent as `false` would offer "Add Reference" on a network that is
already locked. Where certainty matters, fetch the network summary, which always
carries it — `AddReferenceDialog` does exactly this before showing its form.

One trap worth knowing: any hook that reshapes a server listing into
`FileItemBase` must carry these fields through. A hand-picked allowlist silently
drops each new field the server adds, which is how DOI state went missing from
the Shared tab. Prefer spreading the item and normalising only what genuinely
differs.

## Status vocabulary

Amber means "this is about a DOI"; shape carries the state. The two locks differ
only by colour, which is acceptable because both mean "you can't edit this" —
what is lost is the reason, not the constraint. The state that needs action gets
a distinct shape *and* colour. Tooltips are therefore required, not optional
([ADR-0006](./decisions/0006-doi-status-icon-vocabulary.md)).

## Not carried over from the Angular app

The publication-date field ([ADR-0004](./decisions/0004-drop-publication-date.md))
and the metadata completeness meter
([ADR-0005](./decisions/0005-drop-completeness-meter.md)) were deliberately
dropped. They are exclusions, not gaps.

## Requesting a DOI

The request confirms first, with copy that branches on the checkbox — the two
outcomes differ too much for one message to describe both. Certifying
immediately is presented as destructive; deferring the reference is not.

`rightsHolder` is required alongside `author`: the server reads both when
minting, and a missing `author` is one of the three ways a mint fails.

A read-only network is made writable before its metadata is saved, because the
server refuses updates to one, and the flag is **restored if the request fails**
— a failed attempt must not leave a network editable that the user deliberately
locked. A successful request re-applies read-only server-side anyway. This only
happens when there is something to save; an untouched form leaves the flag alone.

The DOI itself is shown in the details panel, as a resolvable `doi.org` link —
a failed mint reads as an error there rather than a link, since `"Pending"` does
not resolve.

## Two traps for callers

**The predicates key off `type`.** They are network-only by construction, so a
raw `NetworkSummary` — which carries no `type` field — reads as *not a network*
and every predicate returns `false`. Shape it first
(`{ ...summary, type: NDExFileType.NETWORK }`), as `DetailsPanel` does. Getting
this wrong is silent: a network stuck at `"Pending"` renders as a real
`doi.org` link.

**Never read `isCertified` on its own.** It is set *before* minting, and the
failure paths reset `doi` without clearing it — so a failed "certify now" request
is left flagged certified with no resolvable DOI. Every predicate requires a real
minted DOI alongside the flag ([ADR-0007](./decisions/0007-iscertified-requires-a-minted-doi.md)).
This is why the *Mint failed* row above says "either".

**Absent `isCertified` is read as "not certified".** `isNetworkCertified`
returns `false` for `undefined`, so against a server older than 3.0.6 — or any
listing path that drops the field — a *certified* network reads as
pre-certified: amber lock instead of the trophy, and Add Reference offered.
`AddReferenceDialog` re-checks the summary and refuses, so nothing is
published wrongly, but the listing is misleading. This is the one place the
code does not follow the "treat absent as unknown" rule above, because a
tri-state predicate would complicate every call site.

## Known gaps

- The server still accepts a reference on a network stuck at `"Pending"`, which
  would certify it with an unresolvable DOI. Only the client guards this.
- `ShareDialog` has no `role="dialog"`, unlike `DialogShell` and `ConfirmDialog`.
  Harmless but inconsistent, and it makes the dialog harder to scope to in tests.
- **Bulk sharing freezes visibility for the whole selection** when *any* selected
  item carries a DOI, including the items that do not. The message says how many
  are affected, but a user cannot change visibility on the rest without
  deselecting. Blunt but safe; splitting the update per item would be the fix.
