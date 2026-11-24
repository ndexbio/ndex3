/**
 * @jest-environment node
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

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

const run = (args: string[], input?: string) => {
  const result = spawnSync('node', [SCRIPT, ...args], { input, encoding: 'utf8' })
  return { code: result.status, out: result.stdout, err: result.stderr }
}

/** Structure mode against a fixture changelog and package.json version. */
const checkStructure = (changelog: string, version = '3.1.0') => {
  fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version }))
  return run(['--changelog', path.join(dir, 'CHANGELOG.md'), '--package', path.join(dir, 'package.json')])
}

const checkPullRequest = (paths: string[]) => run(['--pr'], paths.join('\n') + '\n')

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

describe('--pr', () => {
  it('fails a user-facing change without a CHANGELOG entry, naming the file', () => {
    const { code, err } = checkPullRequest(['src/utils/legacyRedirect.ts', 'docs/legacy-redirects.md'])
    expect(code).toBe(1)
    expect(err).toMatch(/src\/utils\/legacyRedirect\.ts/)
    expect(err).toMatch(/skip-changelog/)
  })

  it('passes the same change once CHANGELOG.md is part of it', () => {
    const { code } = checkPullRequest(['src/utils/legacyRedirect.ts', 'CHANGELOG.md'])
    expect(code).toBe(0)
  })

  it('treats files served with the app as user-facing', () => {
    expect(checkPullRequest(['public/config.json']).code).toBe(1)
  })

  it('needs no entry for tests, docs and CI alone', () => {
    const { code, out } = checkPullRequest([
      'src/utils/legacyRedirect.test.ts',
      'src/components/__tests__/Thing.tsx',
      'test/playwright/not-found.spec.ts',
      'docs/legacy-redirects.md',
      '.github/workflows/ci.yml',
    ])
    expect(code).toBe(0)
    expect(out).toMatch(/no CHANGELOG entry needed/)
  })

  it('refuses an empty path list rather than passing silently', () => {
    const { code, err } = run(['--pr'], '')
    expect(code).toBe(2)
    expect(err).toMatch(/no changed paths/)
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
