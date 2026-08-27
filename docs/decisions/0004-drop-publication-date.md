# 0004 — Drop the publication-date field

Status: accepted (2026-08-27)

## Context

The Angular app collected an intended publication date on the DOI request form,
via a date picker read straight into the `properties` map of the request.

Tracing it: the value appears in the notification email sent to administrators
and nowhere else. It is not a network property, it is not stored against the
network, and nothing reads it back.

## Decision

Not carried over. ndex3 does not collect a publication date.

## Consequences

- No behavioural change to the request itself. The confirmation email loses one
  line.
- One fewer field on an already long form.
- If DOI metadata ever needs a publication date for the registration record
  itself — as opposed to the notification email — this will need revisiting, and
  it would then belong in the minted metadata rather than an email.
