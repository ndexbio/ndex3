# 0006 — DOI status icon vocabulary

Status: accepted (2026-08-27)

## Context

Listings must distinguish four states at a glance: certified, pre-certified, a
failed mint, and plain read-only. Before this, a single trophy covered any
non-pending DOI — claiming "Published network with DOI" for a pre-certified
network that might still be private — and a failed mint was indistinguishable
from an ordinary read-only network.

Candidates considered for pre-certified were a bookmark (tying it to the Add
Reference action) and a stamp (a seal not yet applied).

## Decision

Amber means "this is about a DOI"; the shape carries the state.

| State | Icon | Colour |
| --- | --- | --- |
| Certified | `Trophy` | `amber-500` |
| Pre-certified | `Lock` | `amber-500` |
| Mint failed | `BadgeAlert` | `destructive` |
| Read-only, no DOI | `Lock` | `muted-foreground` |

The lock was chosen over a bookmark or stamp because it leads with the fact the
user actually meets — the network will not edit — where the alternatives led
with the outstanding reference and said nothing about why it is locked. Reusing
the existing lock shape and changing only its colour makes the vocabulary
systematic.

Full `amber-500` rather than a muted variant: the DOI is real and minted at that
point, only certification is outstanding, and a faded accent reads as a
rendering accident more readily than as progress.

## Consequences

- **The two locks differ only by colour**, which fails for colour-blind users
  and in greyscale. Accepted because both states share their primary meaning —
  "you can't edit this" — so what is lost is the reason, not the constraint. The
  state that needs action gets a distinct shape *and* colour instead.
- **Tooltips are therefore required, not optional.** Every one of these icons
  must carry a `title`, or the distinction is legible only to someone who
  already knows the model.
- `hasValidDOI` must not drive the trophy; certification must. Otherwise the
  badge resumes claiming publication that has not happened.
