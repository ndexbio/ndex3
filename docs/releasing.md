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

Three things keep this honest:

- **`CHANGELOG.md` and `package.json` must agree.** `npm run check:changelog`
  (run by CI on every push) fails if the newest `## [X.Y.Z]` section and
  `version` differ, so a release can't bump one and forget the other.
- **Every user-facing PR carries its own entry.** The `Changelog` workflow fails
  a PR that changes `src/` or `public/` without touching `CHANGELOG.md`, unless
  it has the `skip-changelog` label. Cutting a release is then just renaming
  `[Unreleased]`, not reconstructing history from commit messages.
- **Release PRs into `main` use a merge commit,** never squash or rebase. A
  squash creates a commit on `main` that `development` doesn't have, so the next
  release PR re-lists every old commit and can conflict with itself. With merge
  commits `main` stays an ancestor of `development` and each release PR shows
  exactly what's new.

## Choosing the version

Semantic versioning, judged from the point of view of whoever deploys NDEx3:

- **Major:** a deployer has to change something to keep the site working, such
  as a removed or renamed `public/config.json` key, a new required Apache rule,
  or URLs that stop resolving.
- **Minor:** anything under **Added**.
- **Patch:** only **Fixed** (and **Security**) entries.

## Cutting a release

1. From an up-to-date `development`, create `release/X.Y.Z`.
2. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`
   (the day it will merge to `main`) and add a fresh, empty `## [Unreleased]`
   above it. Update the compare links at the bottom of the file — the first
   tagged release adds them.
3. Run `npm version X.Y.Z --no-git-tag-version`. It updates `package.json` and
   `package-lock.json` together; there is no tag yet because the tag belongs on
   `main`.
4. Run `npm run check:changelog` to confirm the two agree.
5. Open a PR from `release/X.Y.Z` into `development` and merge it.
6. Open a PR from `development` into `main` titled "Release X.Y.Z" and merge it
   with **Create a merge commit**.
7. Tag that merge commit and publish the GitHub Release, using the changelog
   section as its notes:

   ```bash
   git fetch origin
   git tag -a vX.Y.Z origin/main -m "Release X.Y.Z"
   git push origin vX.Y.Z
   gh release create vX.Y.Z --verify-tag --title "X.Y.Z" \
     --notes "$(node scripts/check-changelog.js --notes X.Y.Z)"
   ```

8. Build and deploy from the tag.

## Hotfixes

A fix that can't wait for `development` branches from `main` instead:

1. Create `hotfix/X.Y.Z` from `main`, make the fix, and add its entry directly
   under a new `## [X.Y.Z] - YYYY-MM-DD` section, with the matching
   `npm version` bump.
2. PR into `main` with a merge commit, then tag and publish as in step 7 above.
3. PR `main` back into `development` so the fix and its changelog section aren't
   lost. If `CHANGELOG.md` conflicts, keep `development`'s `[Unreleased]`
   entries above the new release section.

## Why 3.0.1 has no tag

Version 3.0.1 and its changelog section arrived in #66 without a tag or a GitHub
Release, and nobody knows which commit was actually deployed as 3.0.1. Tagging
a guess would make the tag misleading, so 3.0.1 stays untagged. The first tagged
release is the one after it, and the changelog's compare links start there.
