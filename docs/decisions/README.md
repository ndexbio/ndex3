# Architecture Decision Records

One file per significant decision, recording **why** we chose something over the
alternatives. Code shows what we did and tests show how it behaves; neither
captures the reasoning, and that is what disappears first.

## Conventions

- **Numbered sequentially**, `NNNN-short-kebab-title.md`. Numbers are never
  reused.
- **Immutable once accepted.** Do not edit an accepted ADR to reflect a change
  of mind — write a new one and mark the old one `superseded by ADR-NNNN`. The
  set is a history of reasoning, not a snapshot of current state.
- **Short.** A page. If it needs more, the detail belongs in a feature doc.
- **Dated**, so a reader can weigh it against what was known at the time.

## What belongs here

A choice between real alternatives, where a future reader might reasonably
undo it without knowing what it cost. "Why `isPreCertified` is stricter than the
server" is an ADR. "How the DOI dialog works" is a feature doc.

If it records no alternative, it is not an ADR.

## Template

```markdown
# NNNN — Title in the imperative

Status: accepted (YYYY-MM-DD)

## Context
The forces in play, and what was known at the time.

## Decision
What was chosen.

## Consequences
What follows — including the costs and anything now harder.
```

## Index

| # | Decision | Status |
| --- | --- | --- |
| [0001](./0001-doi-checkbox-inverts-iscertified.md) | The "reference later" checkbox inverts `isCertified` | accepted |
| [0002](./0002-restrictions-key-off-hasdoi.md) | DOI restrictions key off "has any DOI", not "is certified" | accepted |
| [0003](./0003-precertified-requires-minted-doi.md) | `isPreCertified` requires a minted DOI, not any DOI | accepted |
| [0004](./0004-drop-publication-date.md) | Drop the publication-date field | accepted |
| [0005](./0005-drop-completeness-meter.md) | Drop the metadata completeness meter | accepted |
| [0006](./0006-doi-status-icon-vocabulary.md) | DOI status icon vocabulary | accepted |
| [0007](./0007-iscertified-requires-a-minted-doi.md) | `isCertified` is only meaningful alongside a minted DOI | accepted |
