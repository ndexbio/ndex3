---
status: current
last-verified: 2026-11-24
---

# Releasing

How a version of NDEx3 goes from `development` to a tagged release, and why
the process is shaped this way. The changelog rules for everyday PRs are in the
Changelog section of [`CLAUDE.md`](../CLAUDE.md).

## Releases come from `main` only

`development` is the integration branch: every PR lands there, and at any moment
it may hold work nobody has decided to ship. `main` only moves when a release is
cut, so it always equals the latest release. Every release is a merge commit on
`main` with a `vX.Y.Z` tag, and production is built from that tag, never from
`development`.

What keeps this honest:

- **`CHANGELOG.md` and `package.json` must agree.** `npm run check:changelog`
  (run by CI on every push) fails unless the newest `## [X.Y.Z]` heading is
  exactly `version`, so a release can't bump one and forget the other. It also
  fails a release, or a `###` category, with no entries.
- **Released sections are frozen.** The same check compares every release that
  has a `vX.Y.Z` tag with its section in `CHANGELOG.md` at that tag, and fails
  on any difference. This is what catches the trap in step 7 below.
- **Every user-facing PR carries its own entry.** The `Changelog` workflow fails
  a PR that changes `src/` or `public/` without touching `CHANGELOG.md`, unless
  it has the `skip-changelog` label. Cutting a release is then just renaming
  `[Unreleased]`, not reconstructing history from commit messages.
- **A release ships a fixed set of commits.** The release PR comes from a
  `release/X.Y.Z` branch, not from `development`. Opened from `development`, a
  feature merged while the PR was open would ship under `vX.Y.Z` with its entry
  still sitting under `[Unreleased]`.
- **The tag and notes come from the commit being tagged.**
  `scripts/publish-release.js` reads the version and the notes from the release
  merge commit itself, not from whatever is checked out, and runs every check
  before it creates anything. It only accepts a merge commit on `main`'s
  first-parent line: the release branch's tip is also an ancestor of `main`
  once merged, but its tree lacks anything integrated at merge time.
- **Merge commits in both directions.** The release PR into `main` and the
  merge back into `development` both use **Create a merge commit**, never
  squash or rebase. That keeps `main` an ancestor of `development`, so each
  release PR shows exactly what's new instead of re-listing old commits.

## Choosing the version

Semantic versioning, judged from the point of view of whoever deploys NDEx3:

- **Major:** a deployer has to change something to keep the site working, such
  as a removed or renamed `public/config.json` key, a new required Apache rule,
  or URLs that stop resolving.
- **Minor:** anything under **Added**.
- **Patch:** only **Fixed** (and **Security**) entries.

## Cutting a release

1. From an up-to-date `development`, create `release/X.Y.Z`. This branch fixes
   what ships; anything merged to `development` afterwards waits for the next
   release.
2. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`
   (the day it will merge to `main`) and add a fresh, empty `## [Unreleased]`
   above it. Update the compare links at the bottom of the file — the first
   tagged release adds them.
3. Run `npm version X.Y.Z --no-git-tag-version`. It updates `package.json` and
   `package-lock.json` together; there is no tag yet because the tag belongs on
   `main`.
4. Run `npm run check:changelog` to confirm the two agree.
5. Open a PR from `release/X.Y.Z` into `main` titled "Release X.Y.Z" and merge
   it with **Create a merge commit**.
6. Publish from that merge commit. Its sha is on the PR page, or from
   `gh pr view <number> --json mergeCommit --jq .mergeCommit.oid`. Do a dry run
   first; it runs every check and prints the tag and notes without creating
   anything:

   ```bash
   node scripts/publish-release.js <merge-commit> --dry-run
   node scripts/publish-release.js <merge-commit>
   ```

   Run it from a clone whose `origin` is the repository you release in: the
   tag is pushed there, and the GitHub Release is created in that same
   repository, named explicitly rather than left to `gh`'s default. The dry run
   prints it.

   The script refuses a commit that isn't a merge commit on `origin/main`'s
   first-parent line (so not the release branch's tip), a changelog that
   doesn't match `package.json` at that commit, missing notes, a signed-out
   `gh`, an existing GitHub Release, a tag already pointing elsewhere, and any
   GitHub error other than "not found" when it checks for an existing release.
   All of that happens before a tag exists. If it fails after pushing the tag,
   fix the cause and run it again; it reuses the tag.
7. Open a PR from `main` into `development` and merge it with **Create a merge
   commit**, so `development` gets the dated section and the version bump.
   Entries that landed on `development` after the cut must stay under
   `[Unreleased]`, and Git won't always help. If `CHANGELOG.md` conflicts, keep
   those entries under `[Unreleased]`, above the new release section. Worse, a
   *clean* merge can file a new entry under the release's dated heading without
   any conflict, because the rename of `[Unreleased]` and the new entry touch
   different lines. CI's `npm run check:changelog` on this PR compares the dated
   section with the tag and fails if it changed. Fix it by moving those entries
   back under `[Unreleased]`, and run the check locally before pushing the
   merge.
8. Build and deploy from the tag.

## Hotfixes

The same steps, except the branch is `hotfix/X.Y.Z` cut from `main` instead of
`release/X.Y.Z` from `development`, and the fix is made on it alongside the
changelog section and version bump. Step 7 then brings the fix back to
`development`.

## Why 3.0.1 has no tag

Version 3.0.1 and its changelog section arrived in #66 without a tag or a GitHub
Release, and nobody knows which commit was actually deployed as 3.0.1. Tagging
a guess would make the tag misleading, so 3.0.1 stays untagged. The first tagged
release is the one after it, and the changelog's compare links start there.
