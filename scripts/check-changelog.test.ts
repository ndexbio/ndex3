/**
 * @jest-environment node
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRepo, GIT_ENV, type GitRepo } from './test-utils/git-repo'

// Runs the real script as CI does — exit code and output are the contract.
const SCRIPT = path.join(__dirname, 'check-changelog.js')

const VALID = `# Changelog

## [Unreleased]

### Fixed

- Something not yet released.

## [3.1.0] - 2026-10-01

### Added

- A feature.

### Removed

- A config key.

## [3.0.1] - 2026-09-14

### Changed

- A behaviour.

[3.1.0]: https://github.com/ndexbio/ndex3/compare/v3.0.1...v3.1.0
`

let dir: string
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-changelog-'))
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

const run = (args: string[], cwd?: string) => {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: GIT_ENV, encoding: 'utf8' })
  return { code: result.status, out: result.stdout, err: result.stderr }
}

/** Structure mode against a fixture changelog and package.json version. */
const checkStructure = (changelog: string, version = '3.1.0') => {
  fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version }))
  return run(['--changelog', path.join(dir, 'CHANGELOG.md'), '--package', path.join(dir, 'package.json')])
}

describe('structure', () => {
  it("passes on the repo's own CHANGELOG.md and package.json", () => {
    const { code, out } = run([])
    expect(code).toBe(0)
    expect(out).toMatch(/CHANGELOG\.md OK/)
  })

  it('passes a well-formed changelog whose newest release matches package.json', () => {
    const { code, out } = checkStructure(VALID, '3.1.0')
    expect(code).toBe(0)
    expect(out).toMatch(/matches package\.json 3\.1\.0/)
  })

  it('fails when package.json was bumped but the changelog was not', () => {
    const { code, err } = checkStructure(VALID, '3.2.0')
    expect(code).toBe(1)
    expect(err).toMatch(/newest release is 3\.1\.0 but package\.json says 3\.2\.0/)
  })

  it('fails when there is no numbered release to match package.json', () => {
    const { code, err } = checkStructure('# Changelog\n\n## [Unreleased]\n\n### Added\n\n- A feature.\n', '3.0.1')
    expect(code).toBe(1)
    expect(err).toMatch(/there is no "## \[X\.Y\.Z\] - YYYY-MM-DD" release; the newest must be package\.json's 3\.0\.1/)
  })

  it('rejects a leading zero, which --notes could never look up', () => {
    const { code, err } = checkStructure(VALID.replace('## [3.1.0]', '## [03.1.0]'), '3.1.0')
    expect(code).toBe(1)
    expect(err).toMatch(/"## \[03\.1\.0\] - 2026-10-01" is not "## \[X\.Y\.Z\] - YYYY-MM-DD"/)
  })

  it('fails when [Unreleased] is missing', () => {
    const { code, err } = checkStructure(VALID.replace('## [Unreleased]\n\n### Fixed\n\n- Something not yet released.\n\n', ''))
    expect(code).toBe(1)
    expect(err).toMatch(/first "##" heading must be "## \[Unreleased\]"/)
  })

  it('fails a release heading without a date', () => {
    const { code, err } = checkStructure(VALID.replace('## [3.0.1] - 2026-09-14', '## [3.0.1]'))
    expect(code).toBe(1)
    expect(err).toMatch(/"## \[3\.0\.1\]" is not "## \[X\.Y\.Z\] - YYYY-MM-DD"/)
  })

  it('fails a date that does not exist', () => {
    const { code, err } = checkStructure(VALID.replace('2026-09-14', '2026-02-30'))
    expect(code).toBe(1)
    expect(err).toMatch(/2026-02-30 is not a real date/)
  })

  it('fails releases that are not newest first', () => {
    const swapped = VALID.replace('## [3.1.0] - 2026-10-01', '## [3.0.0] - 2026-10-01')
    const { code, err } = checkStructure(swapped, '3.0.0')
    expect(code).toBe(1)
    expect(err).toMatch(/3\.0\.1 must be older than 3\.0\.0/)
  })

  it('fails a category Keep a Changelog does not define', () => {
    const { code, err } = checkStructure(VALID.replace('### Removed', '### Improvements'))
    expect(code).toBe(1)
    expect(err).toMatch(/"### Improvements" is not one of Added, Changed/)
  })

  it('ignores headings inside fenced code blocks', () => {
    const withExample = VALID.replace('- A feature.', '- A feature.\n\n```md\n## not a release\n### Nor a category\n```')
    expect(checkStructure(withExample).code).toBe(0)
  })
})

describe('--ref', () => {
  let repo: GitRepo
  beforeEach(() => {
    repo = createRepo(dir)
    repo.commit({ 'CHANGELOG.md': VALID, 'package.json': JSON.stringify({ version: '3.1.0' }) })
    // A working tree that disagrees with the commit, as a stale checkout would.
    fs.writeFileSync(path.join(repo.work, 'CHANGELOG.md'), '# Changelog\n\n## [3.1.0] - 2026-10-01\n\n- Stale notes.\n')
  })

  it('validates the files at that commit, not the working tree', () => {
    const working = run(['--changelog', path.join(repo.work, 'CHANGELOG.md'), '--package', path.join(repo.work, 'package.json')])
    expect(working.code).toBe(1)

    const atCommit = run(['--ref', 'HEAD'], repo.work)
    expect(atCommit.code).toBe(0)
    expect(atCommit.out).toMatch(/OK at HEAD/)
  })

  it('prints notes from that commit, not the working tree', () => {
    const { code, out } = run(['--ref', 'HEAD', '--notes', '3.1.0'], repo.work)
    expect(code).toBe(0)
    expect(out).toBe('### Added\n\n- A feature.\n\n### Removed\n\n- A config key.\n')
  })

  it('refuses to be combined with --changelog', () => {
    const { code, err } = run(['--ref', 'HEAD', '--changelog', 'CHANGELOG.md'], repo.work)
    expect(code).toBe(2)
    expect(err).toMatch(/cannot be combined/)
  })
})

describe('--pr', () => {
  let repo: GitRepo
  beforeEach(() => {
    repo = createRepo(dir)
    repo.commit({
      'CHANGELOG.md': VALID,
      'src/utils/legacyRedirect.ts': 'export {}\n',
      'public/help.html': '<p>help</p>\n',
      'docs/legacy-redirects.md': '# Redirects\n',
    })
    repo.git('checkout', '--quiet', '-b', 'feature')
  })

  const checkPullRequest = () => run(['--pr', 'main'], repo.work)

  it('fails a user-facing change without a CHANGELOG entry, naming the file', () => {
    repo.commit({ 'src/utils/legacyRedirect.ts': 'export const x = 1\n', 'docs/legacy-redirects.md': '# Changed\n' })
    const { code, err } = checkPullRequest()
    expect(code).toBe(1)
    expect(err).toMatch(/src\/utils\/legacyRedirect\.ts/)
    expect(err).not.toMatch(/docs\/legacy-redirects\.md/)
    expect(err).toMatch(/skip-changelog/)
  })

  it('passes the same change once CHANGELOG.md is part of it', () => {
    repo.commit({ 'src/utils/legacyRedirect.ts': 'export const x = 1\n', 'CHANGELOG.md': `${VALID}\n` })
    expect(checkPullRequest().code).toBe(0)
  })

  it('counts moving a file out of public/ as a change to public/', () => {
    // Git's rename detection would report only docs/help.html.
    repo.commit({ 'public/help.html': null, 'docs/help.html': '<p>help</p>\n' })
    const { code, err } = checkPullRequest()
    expect(code).toBe(1)
    expect(err).toMatch(/public\/help\.html/)
  })

  it('reads non-ASCII paths verbatim rather than git-quoted', () => {
    repo.commit({ 'public/café.svg': '<svg/>\n' })
    const { code, err } = checkPullRequest()
    expect(code).toBe(1)
    expect(err).toContain('  public/café.svg')
  })

  it('needs no entry for tests, docs and CI alone', () => {
    repo.commit({
      'src/utils/legacyRedirect.test.ts': 'test\n',
      'src/components/__tests__/Thing.tsx': 'test\n',
      'test/playwright/not-found.spec.ts': 'test\n',
      'docs/legacy-redirects.md': '# Changed\n',
      '.github/workflows/ci.yml': 'name: CI\n',
    })
    const { code, out } = checkPullRequest()
    expect(code).toBe(0)
    expect(out).toMatch(/no CHANGELOG entry needed/)
  })

  it("ignores changes on the base branch that the PR doesn't contain", () => {
    repo.git('checkout', '--quiet', 'main')
    repo.commit({ 'src/utils/legacyRedirect.ts': 'export const onMain = 1\n' })
    repo.git('checkout', '--quiet', 'feature')
    repo.commit({ 'docs/legacy-redirects.md': '# Changed\n' })
    expect(checkPullRequest().code).toBe(0)
  })

  it('fails, rather than passing, when the diff itself fails', () => {
    const { code, err } = run(['--pr', 'no-such-branch'], repo.work)
    expect(code).toBe(1)
    expect(err).toMatch(/git diff .* failed/)
  })
})

describe('--notes', () => {
  const notes = (version: string) => {
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), VALID)
    return run(['--notes', version, '--changelog', path.join(dir, 'CHANGELOG.md')])
  }

  it("prints only that release's entries, accepting a tag-style v prefix", () => {
    const { code, out } = notes('v3.1.0')
    expect(code).toBe(0)
    expect(out).toBe('### Added\n\n- A feature.\n\n### Removed\n\n- A config key.\n')
  })

  it('leaves trailing link definitions out of the last release', () => {
    const { out } = notes('3.0.1')
    expect(out).toBe('### Changed\n\n- A behaviour.\n')
  })

  it('fails for a version that is not in the changelog', () => {
    const { code, err } = notes('9.9.9')
    expect(code).toBe(1)
    expect(err).toMatch(/no "## \[9\.9\.9\]" section/)
  })
})
