/**
 * @jest-environment node
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRepo, GIT_ENV, type GitRepo } from './test-utils/git-repo'

const SCRIPT = path.join(__dirname, 'publish-release.js')

const changelog = (newest: string) => `# Changelog

## [Unreleased]

${newest}## [3.0.1] - 2026-09-14

### Changed

- A behaviour.
`
const RELEASE_3_1_0 = '## [3.1.0] - 2026-10-01\n\n### Added\n\n- A feature.\n\n'
const pkg = (version: string) => `${JSON.stringify({ name: 'ndex-next', version }, null, 2)}\n`

// A stand-in for gh that records what it was asked and reads the notes from
// stdin, as `--notes-file -` makes the real one do.
const FAKE_GH = `#!/bin/sh
echo "$*" >> "$FAKE_GH_LOG"
case "$1 $2" in
  "auth status") exit 0 ;;
  "release view") exit "\${FAKE_GH_VIEW_EXIT:-1}" ;;
  "release create") cat > "$FAKE_GH_NOTES"; exit "\${FAKE_GH_CREATE_EXIT:-0}" ;;
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

/** The release PR's merge commit, pushed to origin/main. */
const mergeRelease = (files = { 'CHANGELOG.md': changelog(RELEASE_3_1_0), 'package.json': pkg('3.1.0') }) => {
  const sha = repo.commit(files, 'Release 3.1.0')
  repo.git('push', '--quiet', 'origin', 'main')
  return sha
}

const ghCalls = () => (fs.existsSync(ghLog) ? fs.readFileSync(ghLog, 'utf8') : '')

it('tags the commit on origin and publishes the notes from that commit, even from a stale checkout', () => {
  const sha = mergeRelease()
  // The checkout is behind: its CHANGELOG.md has no 3.1.0 section at all.
  repo.git('checkout', '--quiet', base)

  const { code, err } = publish([sha])

  expect(err).toBe('')
  expect(code).toBe(0)
  expect(repo.remoteTag('v3.1.0')).toBe(sha)
  expect(ghCalls()).toContain('release create v3.1.0 --verify-tag --title 3.1.0 --notes-file -')
  expect(fs.readFileSync(ghNotes, 'utf8')).toBe('### Added\n\n- A feature.\n')
})

it('checks everything on --dry-run but tags and publishes nothing', () => {
  const sha = mergeRelease()

  const { code, out } = publish([sha, '--dry-run'])

  expect(code).toBe(0)
  expect(out).toContain(`commit  ${sha}`)
  expect(out).toContain('tag     v3.1.0')
  expect(out).toContain('- A feature.')
  expect(repo.git('tag', '--list')).toBe('')
  expect(repo.remoteTag('v3.1.0')).toBe('')
  expect(ghCalls()).not.toContain('release create')
})

it('refuses a commit that is not on main', () => {
  repo.git('checkout', '--quiet', '-b', 'release/3.1.0')
  const sha = repo.commit({ 'CHANGELOG.md': changelog(RELEASE_3_1_0), 'package.json': pkg('3.1.0') })
  repo.git('push', '--quiet', 'origin', 'release/3.1.0')

  const { code, err } = publish([sha])

  expect(code).toBe(1)
  expect(err).toMatch(/is not on origin\/main/)
  expect(repo.remoteTag('v3.1.0')).toBe('')
})

it("refuses when the commit's package.json and CHANGELOG.md disagree", () => {
  const sha = mergeRelease({ 'CHANGELOG.md': changelog(RELEASE_3_1_0), 'package.json': pkg('3.2.0') })

  const { code, err } = publish([sha])

  expect(code).toBe(1)
  expect(err).toMatch(/newest release is 3\.1\.0 but package\.json says 3\.2\.0/)
  expect(repo.remoteTag('v3.2.0')).toBe('')
  expect(ghCalls()).not.toContain('release create')
})

it('refuses a tag that already points at a different commit', () => {
  repo.git('tag', '-a', 'v3.1.0', base, '-m', 'wrong commit')
  repo.git('push', '--quiet', 'origin', 'v3.1.0')
  const sha = mergeRelease()

  const { code, err } = publish([sha])

  expect(code).toBe(1)
  expect(err).toContain(`Tag v3.1.0 already exists at ${base}, not ${sha}`)
  expect(ghCalls()).not.toContain('release create')
})

it('refuses when the GitHub Release already exists', () => {
  const sha = mergeRelease()

  const { code, err } = publish([sha], { FAKE_GH_VIEW_EXIT: '0' })

  expect(code).toBe(1)
  expect(err).toMatch(/v3\.1\.0 is already published/)
  expect(repo.remoteTag('v3.1.0')).toBe('')
})

it('can be re-run after the release step fails, reusing the pushed tag', () => {
  const sha = mergeRelease()

  const failed = publish([sha], { FAKE_GH_CREATE_EXIT: '1' })
  expect(failed.code).toBe(1)
  expect(failed.err).toMatch(/v3\.1\.0 is pushed, but the GitHub Release was not created/)
  expect(repo.remoteTag('v3.1.0')).toBe(sha)

  const retried = publish([sha])
  expect(retried.code).toBe(0)
  expect(retried.out).toMatch(/already exists here; reusing it/)
  expect(fs.readFileSync(ghNotes, 'utf8')).toBe('### Added\n\n- A feature.\n')
})
