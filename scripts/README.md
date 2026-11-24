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

- `npm run check:changelog`: validates the file's structure and that its newest
  release matches `version` in `package.json`. Runs in the `Docs` CI job.
- `git diff --name-only BASE HEAD | node scripts/check-changelog.js --pr`: fails
  when the diff touches `src/` or `public/` (tests excepted) without touching
  `CHANGELOG.md`. Runs in `.github/workflows/changelog.yml`, which skips it for
  PRs labelled `skip-changelog`.
- `node scripts/check-changelog.js --notes X.Y.Z`: prints one release's entries,
  for the GitHub Release notes.
