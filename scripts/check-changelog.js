#!/usr/bin/env node
/**
 * Keeps CHANGELOG.md usable as the release record. Three modes:
 *
 *   node scripts/check-changelog.js
 *     Validates structure: `## [Unreleased]` comes first; every other `##` is
 *     `## [X.Y.Z] - YYYY-MM-DD`, newest first; `###` headings use Keep a
 *     Changelog's six categories; and the newest release's version text is
 *     exactly `version` in package.json — so a release can't bump one and
 *     forget the other.
 *
 *   node scripts/check-changelog.js --pr <base>
 *     Fails when `<base>...HEAD` changes something a user or deployer would
 *     notice but not CHANGELOG.md. The workflow, not this script, honours the
 *     `skip-changelog` label, because labels are a GitHub concept.
 *
 *   node scripts/check-changelog.js --notes X.Y.Z
 *     Prints that release's entries (a leading `v` is accepted), for the
 *     GitHub Release. `--notes Unreleased` previews the next release.
 *
 * `--ref <commit>` makes the structure and notes modes read CHANGELOG.md and
 * package.json from that commit instead of the working tree, so release notes
 * come from the commit being tagged, not from whatever is checked out.
 * `--changelog <file>` and `--package <file>` replace the working-tree files.
 *
 * Git commands run in the current directory's repository. Node built-ins only,
 * so CI can run it without `npm ci`.
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const CATEGORIES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']
const UNRELEASED = '## [Unreleased]'
// SemVer forbids leading zeros. Allowing `[03.0.1]` would let it "match" 3.0.1
// numerically while `--notes 3.0.1` could never find it.
const NUMBER = '(0|[1-9]\\d*)'
const RELEASE_HEADING = new RegExp(`^## \\[(${NUMBER}\\.${NUMBER}\\.${NUMBER})\\] - (\\d{4}-\\d{2}-\\d{2})$`)
const LINK_DEFINITION = /^\[[^\]]+\]:\s*\S/

/**
 * What a user or deployer can notice: the app's code and the files served with
 * it (config.json, content, assets). Tests living next to the code don't count.
 * Everything else — docs, tests, CI, scripts — is deliberately left out to keep
 * false alarms rare; the PR template asks the human question for those.
 */
const USER_FACING = [/^src\//, /^public\//]
const NOT_USER_FACING = [/\.(test|spec)\.[jt]sx?$/, /\/__(tests|mocks)__\//]

const fail = (lines, code = 1) => {
  console.error(lines.join('\n'))
  process.exit(code)
}

const args = process.argv.slice(2)
const option = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  const value = args[i + 1]
  // A value starting with `-` is a missing value, and passing it on to git
  // would turn it into an option.
  if (value === undefined || value.startsWith('-')) fail([`${name} needs a value`], 2)
  return value
}

const changelogPath = path.resolve(option('--changelog') ?? path.join(repoRoot, 'CHANGELOG.md'))
const packagePath = path.resolve(option('--package') ?? path.join(repoRoot, 'package.json'))
const ref = option('--ref')
if (ref !== undefined && (args.includes('--changelog') || args.includes('--package'))) {
  fail(['--ref reads both files from git; it cannot be combined with --changelog or --package'], 2)
}

const git = (gitArgs) => {
  const result = spawnSync('git', gitArgs, { encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    fail([`git ${gitArgs.join(' ')} failed: ${(result.stderr || result.error?.message || '').trim()}`])
  }
  return result.stdout
}

/** A file's text from the working tree, or — with --ref — from that commit. */
const readSource = (file, pathInRepo) => {
  if (ref !== undefined) return git(['show', `${ref}:${pathInRepo}`])
  if (!fs.existsSync(file)) fail([`${file} does not exist`])
  return fs.readFileSync(file, 'utf8')
}

/**
 * Splits the changelog into its `##` sections. A `#` inside a fenced code block
 * is an example, not a heading, so each body line records whether it is fenced.
 */
const sectionsOf = (text) => {
  const sections = []
  let current = null
  let fenced = false
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.startsWith('```')) fenced = !fenced
    if (!fenced && line.startsWith('## ')) {
      current = { heading: line.trimEnd(), line: i + 1, body: [] }
      sections.push(current)
    } else if (current) {
      current.body.push({ text: line, line: i + 1, fenced })
    }
  })
  return sections
}

const compareVersions = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

const isRealDate = (iso) => {
  const parsed = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(iso)
}

const structureProblems = (text, packageVersion) => {
  const problems = []
  const sections = sectionsOf(text)
  const hasUnreleased = sections[0]?.heading === UNRELEASED
  if (!hasUnreleased) problems.push(`the first "##" heading must be "${UNRELEASED}"`)

  let newest = null
  let above = null
  for (const section of hasUnreleased ? sections.slice(1) : sections) {
    const match = section.heading.match(RELEASE_HEADING)
    if (!match) {
      problems.push(`line ${section.line}: "${section.heading}" is not "## [X.Y.Z] - YYYY-MM-DD"`)
      continue
    }
    const [, name, major, minor, patch, date] = match
    const version = [major, minor, patch].map(Number)
    if (!isRealDate(date)) problems.push(`line ${section.line}: ${date} is not a real date`)
    if (above === null) newest = { name, line: section.line }
    else if (compareVersions(version, above.version) >= 0) {
      problems.push(`line ${section.line}: ${name} must be older than ${above.name}, which is above it`)
    }
    above = { version, name }
  }

  // Compared as text, exactly as written: the tag is built from package.json
  // and the notes are looked up by this heading, so the two must be identical.
  if (newest === null) {
    problems.push(`there is no "## [X.Y.Z] - YYYY-MM-DD" release; the newest must be package.json's ${packageVersion}`)
  } else if (newest.name !== packageVersion) {
    problems.push(
      `line ${newest.line}: newest release is ${newest.name} but package.json says ${packageVersion} — they must match`,
    )
  }

  for (const section of sections) {
    for (const { text: line, line: n, fenced } of section.body) {
      if (fenced || !line.startsWith('### ')) continue
      const category = line.slice(4).trim()
      if (!CATEGORIES.includes(category)) {
        problems.push(`line ${n}: "### ${category}" is not one of ${CATEGORIES.join(', ')}`)
      }
    }
  }
  return problems
}

const checkStructure = () => {
  let version
  try {
    version = JSON.parse(readSource(packagePath, 'package.json')).version
  } catch (error) {
    fail([`package.json is not valid JSON: ${error.message}`])
  }
  if (typeof version !== 'string' || version === '') fail(['package.json has no "version"'])
  const problems = structureProblems(readSource(changelogPath, 'CHANGELOG.md'), version)
  if (problems.length > 0) {
    fail([`\n${problems.length} CHANGELOG.md problem(s):\n`, ...problems.map((p) => `  ${p}`), ''])
  }
  console.log(`CHANGELOG.md OK${ref ? ` at ${ref}` : ''} (newest release matches package.json ${version})`)
}

const checkPullRequest = (base) => {
  // --no-renames: a rename is reported as delete + add, so moving a file out of
  // public/ still counts as removing a served URL. -z: paths arrive verbatim,
  // NUL-separated, instead of quoted when they contain non-ASCII characters.
  // Three dots: only what HEAD adds since it diverged from base.
  const changed = git(['diff', '--no-renames', '--name-only', '-z', `${base}...HEAD`])
    .split('\0')
    .filter((p) => p !== '')

  const userFacing = changed.filter(
    (p) => USER_FACING.some((r) => r.test(p)) && !NOT_USER_FACING.some((r) => r.test(p)),
  )
  if (userFacing.length === 0) {
    console.log('No user-facing files changed; no CHANGELOG entry needed.')
    return
  }
  if (changed.includes('CHANGELOG.md')) {
    console.log('CHANGELOG.md is updated.')
    return
  }
  const shown = userFacing.slice(0, 10)
  fail([
    'This PR changes user-facing files but not CHANGELOG.md:',
    ...shown.map((p) => `  ${p}`),
    ...(userFacing.length > shown.length ? [`  …and ${userFacing.length - shown.length} more`] : []),
    '',
    'Add an entry under "## [Unreleased]" (see the Changelog section of CLAUDE.md).',
    'If nobody using or deploying NDEx3 would notice this change, add the',
    '"skip-changelog" label to the PR instead.',
  ])
}

const printNotes = (requested) => {
  const wanted = requested.replace(/^v/, '')
  const section = sectionsOf(readSource(changelogPath, 'CHANGELOG.md')).find(
    (s) => s.heading.match(/^## \[([^\]]+)\]/)?.[1] === wanted,
  )
  if (!section) fail([`CHANGELOG.md has no "## [${wanted}]" section`])
  // Link definitions (`[3.1.0]: https://…`) trail the last section; they are
  // not part of any release's notes.
  const lines = section.body.map((l) => l.text).filter((l) => !LINK_DEFINITION.test(l))
  const notes = lines.join('\n').trim()
  if (!notes) fail([`"## [${wanted}]" has no entries`])
  console.log(notes)
}

const notesVersion = option('--notes')
const prBase = option('--pr')
if (notesVersion !== undefined) printNotes(notesVersion)
else if (prBase !== undefined) checkPullRequest(prBase)
else checkStructure()
