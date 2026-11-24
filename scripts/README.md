# Scripts

## generate-config.js

This script generates the `public/config.json` file using the base path defined in `next.config.ts`. This ensures that the base path configuration is centralized in a single location.

### Usage

```bash
npm run generate-config
```

The script automatically runs before `build` and `export` commands to ensure the config.json is always up to date with the current base path configuration.

### How it works

1. Imports the `BASE_PATH` constant from `next.config.ts`
2. Generates the complete config object with the correct `urlBaseName`
3. Writes the config to `public/config.json`

This approach ensures that if you need to change the base path, you only need to update it in one place: the `BASE_PATH` constant in `next.config.ts`.

## check-changelog.js

Keeps `CHANGELOG.md` usable as the release record; see
[`docs/releasing.md`](../docs/releasing.md) for the process it supports. It uses
only Node built-ins, so CI runs it without `npm ci`.

- `npm run check:changelog` (the script with `--tags`): validates the file's
  structure, that every release and category has entries, and that the newest
  release heading is exactly `version` in `package.json`. It also checks that
  every release with a `vX.Y.Z` tag still reads exactly as it did at that tag,
  which catches a clean merge that slides a newer entry into a released section.
  It needs full history; it refuses a shallow clone rather than skipping every
  tag. Runs in the `Docs` CI job.
- `node scripts/check-changelog.js --pr <base>`: fails when `<base>...HEAD`
  touches `src/` or `public/` (tests excepted) without touching `CHANGELOG.md`.
  It runs the diff itself, without rename detection and with NUL-separated
  paths, so moving a file out of `public/` or adding a non-ASCII filename still
  counts. Runs in `.github/workflows/changelog.yml`, which skips it for PRs
  labelled `skip-changelog`. Locally, `--pr origin/development` checks your
  branch.
- `node scripts/check-changelog.js --notes X.Y.Z`: prints one release's entries.
- `--ref <commit>` makes the structure check and `--notes` read both files from
  that commit instead of the working tree.

## publish-release.js

`node scripts/publish-release.js <release-merge-commit> [--dry-run]` tags a
release on `main` and creates its GitHub Release. The version and notes come
from that commit, never from the checkout, and every check runs before anything
is created. The tag and the release both go to `origin`'s GitHub repository,
which is passed to `gh` explicitly. It is safe to re-run if the GitHub step
fails. See
[`docs/releasing.md`](../docs/releasing.md) for when to run it and what it
refuses.
