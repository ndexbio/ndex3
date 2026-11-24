#!/usr/bin/env node
/**
 * Keeps CHANGELOG.md usable as the release record. Three modes:
 *
 *   node scripts/check-changelog.js
 *     Validates structure: `## [Unreleased]` comes first; every other `##` is
 *     `## [X.Y.Z] - YYYY-MM-DD`, newest first; `###` headings use Keep a
 *     Changelog's six categories; and the newest release matches `version` in
 *     package.json — so a release can't bump one and forget the other.
 *
 *   git diff --name-only BASE HEAD | node scripts/check-changelog.js --pr
 *     Fails when the changed paths include something a user or deployer would
 *     notice but CHANGELOG.md is not among them. The workflow, not this script,
 *     honours the `skip-changelog` label, because labels are a GitHub concept.
 *
 *   node scripts/check-changelog.js --notes X.Y.Z
 *     Prints that release's entries (a leading `v` is accepted), for use as the
 *     GitHub Release notes. `--notes Unreleased` previews the next release.
 *
 * `--changelog <file>` and `--package <file>` replace the repo's own files,
 * which is how the tests point it at fixtures.
 *
 * Node built-ins only, so CI can run it without `npm ci`.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const CATEGORIES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']
const UNRELEASED = '## [Unreleased]'
const RELEASE_HEADING = /^## \[(\d+)\.(\d+)\.(\d+)\] - (\d{4}-\d{2}-\d{2})$/
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
  if (value === undefined || value.startsWith('--')) fail([`${name} needs a value`], 2)
  return value
}

const changelogPath = path.resolve(option('--changelog') ?? path.join(repoRoot, 'CHANGELOG.md'))
const packagePath = path.resolve(option('--package') ?? path.join(repoRoot, 'package.json'))

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

  let above = null
  for (const section of hasUnreleased ? sections.slice(1) : sections) {
    const match = section.heading.match(RELEASE_HEADING)
    if (!match) {
      problems.push(`line ${section.line}: "${section.heading}" is not "## [X.Y.Z] - YYYY-MM-DD"`)
      continue
    }
    const version = match.slice(1, 4).map(Number)
    const name = version.join('.')
    if (!isRealDate(match[4])) problems.push(`line ${section.line}: ${match[4]} is not a real date`)
    if (above === null) {
      if (packageVersion !== undefined && name !== packageVersion) {
        problems.push(
          `line ${section.line}: newest release is ${name} but package.json says ${packageVersion} — they must match`,
        )
      }
    } else if (compareVersions(version, above.version) >= 0) {
      problems.push(`line ${section.line}: ${name} must be older than ${above.name}, which is above it`)
    }
    above = { version, name }
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

const readChangelog = () => {
  if (!fs.existsSync(changelogPath)) fail([`${changelogPath} does not exist`])
  return fs.readFileSync(changelogPath, 'utf8')
}

const checkStructure = () => {
  const { version } = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const problems = structureProblems(readChangelog(), version)
  if (problems.length > 0) {
    fail([`\n${problems.length} CHANGELOG.md problem(s):\n`, ...problems.map((p) => `  ${p}`), ''])
  }
  console.log(`CHANGELOG.md OK (newest release matches package.json ${version})`)
}

const checkPullRequest = () => {
  if (process.stdin.isTTY) fail(['--pr reads changed paths from stdin; pipe `git diff --name-only` into it'], 2)
  const changed = fs.readFileSync(0, 'utf8').split(/\r?\n/).map((p) => p.trim()).filter(Boolean)
  // An empty list means the diff command upstream went wrong; a PR always
  // changes something. Passing here would hide that.
  if (changed.length === 0) fail(['no changed paths on stdin — check the diff command feeding --pr'], 2)

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
  const section = sectionsOf(readChangelog()).find(
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
if (notesVersion !== undefined) printNotes(notesVersion)
else if (args.includes('--pr')) checkPullRequest()
else checkStructure()
