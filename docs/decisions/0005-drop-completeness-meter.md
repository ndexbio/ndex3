# 0005 — Drop the metadata completeness meter

Status: accepted (2026-08-27)

## Context

The Angular app scored metadata richness as the user typed and rendered it as a
coloured progress bar. Weighted properties: author, description, reference,
name, version and organism at 10 points each; labels, rights, rightsHolder and
tissue at 5. The bar changed colour at the 25 / 50 / 75 thresholds.

It was advisory only. Nothing gated on the score, and a low-scoring request
submitted exactly like a high-scoring one.

## Decision

Not carried over. ndex3 shows no completeness score.

## Consequences

- **This is a real reduction, not a free removal.** The meter nudged users past
  the minimum toward richer records; required-field validation now carries all
  the guidance, and it only enforces the floor.
- Worth revisiting if the metadata quality of published networks visibly drops.
  A lighter-touch alternative — prompting for the few high-value empty fields at
  submit time — would recover most of the benefit without a scoring model.
