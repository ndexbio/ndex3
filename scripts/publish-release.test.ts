/**
 * @jest-environment node
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRepo, GIT_ENV, ORIGIN_REPOSITORY, type GitRepo } from './test-utils/git-repo'

const SCRIPT = path.join(__dirname, 'publish-release.js')

const changelog = (newest: string) => `# Changelog

## [Unreleased]

${newest}## [3.0.1] - 2026-09-14

### Changed

- A behaviour.
`
const RELEASE_3_1_0 = '## [3.1.0] - 2026-10-01\n\n### Added\n\n- A feature.\n\n'
const pkg = (version: string) => `${JSON.stringify({ name: 'ndex-next', version }, null, 2)}\n`
const RELEASE_FILES = { 'CHANGELOG.md': changelog(RELEASE_3_1_0), 'package.json': pkg('3.1.0') }

// A stand-in for gh. It records every call; answers the release lookup as
// GitHub would, per FAKE_GH_LOOKUP (absent → 404, exists, or any other text as
// an error); and reads the notes from stdin, as `--notes-file -` makes the real
// one do.
const FAKE_GH = `#!/bin/sh
echo "$*" >> "$FAKE_GH_LOG"
case "$1" in
  auth) exit 0 ;;
  api)
    case "$*" in
      */releases/tags/*)
        case "\${FAKE_GH_LOOKUP:-absent}" in
          absent) echo "gh: Not Found (HTTP 404)" >&2; exit 1 ;;
          exists) echo '{"tag_name":"v3.1.0"}'; exit 0 ;;
          *) echo "gh: $FAKE_GH_LOOKUP" >&2; exit 1 ;;
        esac ;;
      *) echo "test-owner/test-repo"; exit 0 ;;
    esac ;;
  release)
    [ "$2" = create ] || exit 2
    cat > "$FAKE_GH_NOTES"; exit "\${FAKE_GH_CREATE_EXIT:-0}" ;;
esac
exit 2
`

let root: string
let repo: GitRepo
let ghLog: string
let ghNotes: string
let bin: string
let base: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-release-'))
  repo = createRepo(root)
  bin = path.join(root, 'bin')
  fs.mkdirSync(bin)
  fs.writeFileSync(path.join(bin, 'gh'), FAKE_GH, { mode: 0o755 })
  ghLog = path.join(root, 'gh.log')
  ghNotes = path.join(root, 'gh-notes.md')

  base = repo.commit({ 'CHANGELOG.md': changelog(''), 'package.json': pkg('3.0.1') }, 'Base')
  repo.git('push', '--quiet', 'origin', 'main')
})
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

const publish = (args: string[], env: Record<string, string> = {}) => {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: repo.work,
    encoding: 'utf8',
    env: { ...GIT_ENV, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_GH_LOG: ghLog, FAKE_GH_NOTES: ghNotes, ...env },
  })
  return { code: result.status, out: result.stdout, err: result.stderr }
}

/**
 * Cuts release/3.1.0 from main, commits the release on it, and merges it into
 * main with a merge commit — what GitHub's "Create a merge commit" produces.
 */
const mergeRelease = (files: Record<string, string> = RELEASE_FILES) => {
  repo.git('checkout', '--quiet', '-b', 'release/3.1.0', 'main')
  const tip = repo.commit(files, 'Release 3.1.0')
  repo.git('checkout', '--quiet', 'main')
  repo.git('merge', '--quiet', '--no-ff', '-m', 'Merge release/3.1.0', 'release/3.1.0')
  repo.git('push', '--quiet', 'origin', 'main')
  return { merge: repo.git('rev-parse', 'HEAD'), tip }
}

const ghCalls = () => (fs.existsSync(ghLog) ? fs.readFileSync(ghLog, 'utf8') : '')

it('tags the merge commit on origin and publishes the notes from that commit, even from a stale checkout', () => {
  const { merge } = mergeRelease()
  // The checkout is behind: its CHANGELOG.md has no 3.1.0 section at all.
  repo.git('checkout', '--quiet', base)

  const { code, err } = publish([merge])

  expect(err).toBe('')
  expect(code).toBe(0)
  expect(repo.remoteTag('v3.1.0')).toBe(merge)
  expect(ghCalls()).toContain(`release create v3.1.0 --repo ${ORIGIN_REPOSITORY} --verify-tag --title 3.1.0 --notes-file -`)
  expect(fs.readFileSync(ghNotes, 'utf8')).toBe('### Added\n\n- A feature.\n')
})

it("names origin's repository in every GitHub call instead of relying on gh's default", () => {
  const { merge } = mergeRelease()

  expect(publish([merge]).code).toBe(0)

  const calls = ghCalls().trim().split('\n').filter((line) => /^(api|release)\b/.test(line))
  expect(calls.length).toBeGreaterThanOrEqual(3)
  for (const call of calls) expect(call).toContain('test-owner/test-repo')
})

it('refuses when origin is not a GitHub repository', () => {
  const { merge } = mergeRelease()
  repo.git('remote', 'set-url', 'origin', repo.origin)

  const { code, err } = publish([merge])

  expect(code).toBe(1)
  expect(err).toMatch(/is not a GitHub repository URL/)
  expect(repo.remoteTag('v3.1.0')).toBe('')
})

it('tags the release commit even after main has moved past it', () => {
  const { merge } = mergeRelease()
  // Something else reaches main before the release is published, e.g. a hotfix.
  const later = repo.commit({ 'src/hotfix.ts': 'export {}\n' }, 'Later commit on main')
  repo.git('push', '--quiet', 'origin', 'main')

  const { code } = publish([merge])

  expect(code).toBe(0)
  expect(repo.remoteTag('v3.1.0')).toBe(merge)
  expect(repo.remoteTag('v3.1.0')).not.toBe(later)
})

it('checks everything on --dry-run but tags and publishes nothing', () => {
  const { merge } = mergeRelease()

  const { code, out } = publish([merge, '--dry-run'])

  expect(code).toBe(0)
  expect(out).toContain(`repo    ${ORIGIN_REPOSITORY}`)
  expect(out).toContain(`commit  ${merge}`)
  expect(out).toContain('tag     v3.1.0')
  expect(out).toContain('- A feature.')
  expect(repo.git('tag', '--list')).toBe('')
  expect(repo.remoteTag('v3.1.0')).toBe('')
  expect(ghCalls()).not.toContain('release create')
})

it('refuses a commit that is not on main', () => {
  repo.git('checkout', '--quiet', '-b', 'release/3.1.0')
  const sha = repo.commit(RELEASE_FILES)
  repo.git('push', '--quiet', 'origin', 'release/3.1.0')

  const { code, err } = publish([sha])

  expect(code).toBe(1)
  expect(err).toMatch(/is not on origin\/main's first-parent history/)
  expect(repo.remoteTag('v3.1.0')).toBe('')
})

it("refuses the release branch's tip, even once it is merged into main", () => {
  const { tip, merge } = mergeRelease()
  expect(repo.git('merge-base', '--is-ancestor', tip, 'origin/main')).toBe('') // an ancestor, yet still wrong

  const { code, err } = publish([tip])

  expect(code).toBe(1)
  expect(err).toMatch(/is not on origin\/main's first-parent history/)
  expect(err).toMatch(/not the release branch's tip/)
  expect(repo.remoteTag('v3.1.0')).toBe('')
  expect(publish([merge, '--dry-run']).code).toBe(0)
})

it('refuses a commit pushed straight to main rather than merged', () => {
  const sha = repo.commit(RELEASE_FILES, 'Release 3.1.0, committed directly')
  repo.git('push', '--quiet', 'origin', 'main')

  const { code, err } = publish([sha])

  expect(code).toBe(1)
  expect(err).toMatch(/is not a merge commit/)
  expect(repo.remoteTag('v3.1.0')).toBe('')
})

it("refuses when the commit's package.json and CHANGELOG.md disagree", () => {
  const { merge } = mergeRelease({ 'CHANGELOG.md': changelog(RELEASE_3_1_0), 'package.json': pkg('3.2.0') })

  const { code, err } = publish([merge])

  expect(code).toBe(1)
  expect(err).toMatch(/newest release is 3\.1\.0 but package\.json says 3\.2\.0/)
  expect(repo.remoteTag('v3.2.0')).toBe('')
  expect(ghCalls()).not.toContain('release create')
})

it('refuses a tag that already points at a different commit', () => {
  repo.git('tag', '-a', 'v3.1.0', base, '-m', 'wrong commit')
  repo.git('push', '--quiet', 'origin', 'v3.1.0')
  const { merge } = mergeRelease()

  const { code, err } = publish([merge])

  expect(code).toBe(1)
  expect(err).toContain(`Tag v3.1.0 already exists at ${base}, not ${merge}`)
  expect(ghCalls()).not.toContain('release create')
})

it('refuses when the GitHub Release already exists', () => {
  const { merge } = mergeRelease()

  const { code, err } = publish([merge], { FAKE_GH_LOOKUP: 'exists' })

  expect(code).toBe(1)
  expect(err).toMatch(/v3\.1\.0 is already published/)
  expect(repo.remoteTag('v3.1.0')).toBe('')
})

it("stops before tagging when GitHub can't confirm the release is absent", () => {
  const { merge } = mergeRelease()

  const { code, err } = publish([merge], { FAKE_GH_LOOKUP: 'Service Unavailable (HTTP 503)' })

  expect(code).toBe(1)
  expect(err).toMatch(/could not confirm that v3\.1\.0 is not yet released/)
  expect(err).toMatch(/HTTP 503/)
  expect(repo.git('tag', '--list')).toBe('')
  expect(repo.remoteTag('v3.1.0')).toBe('')
  expect(ghCalls()).not.toContain('release create')
})

it('can be re-run after the release step fails, reusing the pushed tag', () => {
  const { merge } = mergeRelease()

  const failed = publish([merge], { FAKE_GH_CREATE_EXIT: '1' })
  expect(failed.code).toBe(1)
  expect(failed.err).toMatch(/v3\.1\.0 is pushed, but the GitHub Release was not created/)
  expect(repo.remoteTag('v3.1.0')).toBe(merge)

  const retried = publish([merge])
  expect(retried.code).toBe(0)
  expect(retried.out).toMatch(/already exists here; reusing it/)
  expect(fs.readFileSync(ghNotes, 'utf8')).toBe('### Added\n\n- A feature.\n')
})
