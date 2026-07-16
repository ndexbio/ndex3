# Remaining Issues & Open Questions

Open questions whose answers would change a documented specification. Each entry
records the question, why it is being asked, and how the spec/implementation
would change based on the answer.

---

## 1. Per-item `permission` in the v3 folder list response

**Question:** Does `GET /v3/files/folders/{id}/list` populate a `permission`
field per item for an authenticated caller (as the Shared-with-me listing
does), reflecting that caller's access to each item?

**Why it's being asked:** The folder-view action menu treats a signed-in
non-owner as strictly read-only, because the only edit-permission signal
available on a folder listing today is `item.permission === WRITE`, which is
not known to be populated on this endpoint. If it *is* populated, a signed-in
user who has WRITE access to some items in another owner's folder should get
edit actions enabled on exactly those items.

**How the spec changes based on the answer:**
- **If populated:** `canEditItem` already reads `item.permission`, so
  signed-in non-owners with WRITE would automatically get per-item edit
  actions — update `docs/folder-viewing-feature.md` to state that signed-in
  non-owners are *not* uniformly read-only, and add a test for the WRITE case.
- **If not populated:** current behavior is correct (signed-in non-owners are
  read-only for v1); no change.

---

## 2. Server listing semantics (foundational assumption)

**Question:** Confirm that `GET /v3/files/folders/{id}/list` returns the
folder's contents according to the folder's visibility/permissions and the
caller's identity — and is **not** scoped to "items owned by the requesting
user" when a token is present.

**Why it's being asked:** The entire folder-viewing design rests on this. PR #36
(an earlier attempt) claimed the endpoint is requester-scoped, which would mean
a signed-in non-owner gets an empty list for a public folder and would require a
tokenless request as a workaround. This design deliberately does **not** do that
— it always sends the token and trusts the server. If the endpoint really is
requester-scoped, that is a server-side bug to fix; no client design can
correctly show a signed-in non-owner a public folder otherwise.

**How the spec changes based on the answer:**
- **If contents are permission-based (expected):** no change; the design is
  correct as documented.
- **If the endpoint is requester-scoped:** this is a server defect to file and
  fix. Do **not** reintroduce a tokenless client-side workaround — it would
  break access to genuinely private items the signed-in viewer is entitled to
  see.

---

## 3. Canonical URLs without trailing slashes

**Question:** Should the application standardize on URLs without a trailing
slash, so that a folder URL remains `/folders/{uuid}` instead of redirecting to
`/folders/{uuid}/`?

**Why it's being asked:** `next.config.ts` currently sets
`trailingSlash: true`, which makes Next.js redirect slashless URLs to their
trailing-slash equivalents. There is no universal requirement to use trailing
slashes; either form is acceptable as long as the application consistently
uses one canonical form. The preferred user-facing form is currently the URL
without the final slash.

**How the spec/implementation changes based on the answer:**
- **If slashless URLs are adopted:** remove `trailingSlash: true` or set it to
  `false`, restart the development server, and verify production routing. The
  application uses `output: 'export'` in production, so this changes static
  output from directory-style paths such as `/about/index.html` to file-style
  paths such as `/about.html`; hosting rewrites and direct deep links must be
  tested before release.
- **If trailing slashes are retained:** make no implementation change and
  continue treating `/folders/{uuid}/` as the canonical URL.
