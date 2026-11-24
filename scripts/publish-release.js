#!/usr/bin/env node
/**
 * Tags a release on main and publishes its GitHub Release, deriving everything
 * from one commit — the release PR's merge commit:
 *
 *   node scripts/publish-release.js <release-merge-commit> [--dry-run]
 *
 * The version is read from package.json *at that commit* and the notes from
 * its CHANGELOG.md, so a stale checkout or a mistyped version can't produce a
 * wrong tag or wrong notes. Every check runs before anything is created:
 *
 *   - origin is a GitHub repository, and both the tag and the release go there;
 *   - the commit is a merge commit on origin/main's first-parent history — the
 *     release PR's merge, not the release branch's tip;
 *   - its CHANGELOG.md is valid and its newest release matches its package.json;
 *   - that release has notes;
 *   - gh is signed in and can reach the repository, and GitHub confirms (404)
 *     that no release exists for the tag yet;
 *   - the tag doesn't already point at a different commit.
 *
 * `--dry-run` stops after the checks and prints what it would do.
 *
 * Safe to re-run: if an earlier run pushed the tag but failed to create the
 * release, a tag already pointing at the same commit is reused.
 *
 * git and gh run in the current directory's repository. Node built-ins only.
 */

import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const REMOTE = 'origin'
const RELEASE_BRANCH = 'main'
const CHECK_CHANGELOG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'check-changelog.js')
// https://host/owner/repo(.git), ssh://user@host/owner/repo(.git), user@host:owner/repo(.git).
// The host must contain a dot, so a relative path like a/b/c is not mistaken for one.
const GITHUB_URL = /^(?:(?:https|ssh):\/\/)?(?:[^@/]+@)?([^/:]+\.[^/:]+)[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/

const fail = (lines, code = 1) => {
  console.error(lines.join('\n'))
  process.exit(code)
}

/** Runs a command without throwing; output is trimmed. */
const run = (command, commandArgs, input) => {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', input })
  if (result.error) return { ok: false, out: '', err: result.error.message }
  return { ok: result.status === 0, out: result.stdout.trim(), err: result.stderr.trim() }
}

/** Runs a command; on failure stops the release, explaining why. */
const must = (why, command, commandArgs, input) => {
  const result = run(command, commandArgs, input)
  if (!result.ok) fail([why, ...(result.err ? [`  ${result.err}`] : [])])
  return result.out
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const positional = args.filter((a) => a !== '--dry-run')
if (positional.length !== 1 || positional[0].startsWith('-')) {
  fail(['usage: node scripts/publish-release.js <release-merge-commit> [--dry-run]'], 2)
}
const [commit] = positional

// --- Checks. Nothing below this line until the dry-run exit changes anything.

// The tag is pushed to origin, so the release must be created in origin's
// repository too. gh's own default can differ — in a fork checkout it is often
// upstream — so every gh call names this repository explicitly. The raw config
// is read because `git remote get-url` applies insteadOf rewrites.
const originUrl =
  run('git', ['config', '--get', `remote.${REMOTE}.pushurl`]).out ||
  must(`there is no remote named ${REMOTE}`, 'git', ['config', '--get', `remote.${REMOTE}.url`])
const urlMatch = originUrl.match(GITHUB_URL)
if (!urlMatch) {
  fail([`${REMOTE} (${originUrl}) is not a GitHub repository URL, so there is no repository to publish the release in.`])
}
const [, host, owner, name] = urlMatch
const repository = `${host}/${owner}/${name}`

must(`could not fetch ${RELEASE_BRANCH} and tags from ${REMOTE}`, 'git', [
  'fetch', '--quiet', '--tags', REMOTE, RELEASE_BRANCH,
])

const sha = must(`${commit} is not a commit in this repository`, 'git', [
  'rev-parse', '--verify', '--quiet', `${commit}^{commit}`,
])

// Being an ancestor of main is not enough: the release branch's tip is one
// too, once merged, but its tree lacks anything integrated at merge time. The
// release PR's merge commit is on main's first-parent line; the tip is not.
const firstParentLine = must(`cannot read ${REMOTE}/${RELEASE_BRANCH}'s history`, 'git', [
  'rev-list', '--first-parent', `${REMOTE}/${RELEASE_BRANCH}`,
]).split('\n')
if (!firstParentLine.includes(sha)) {
  fail([
    `${sha} is not on ${REMOTE}/${RELEASE_BRANCH}'s first-parent history.`,
    "Pass the release PR's merge commit on main — not the release branch's tip.",
  ])
}
const parents = must(`cannot read ${sha}`, 'git', ['rev-list', '--parents', '-n', '1', sha]).split(' ').slice(1)
if (parents.length < 2) {
  fail([
    `${sha} is not a merge commit.`,
    `Release PRs into ${RELEASE_BRANCH} are merged with "Create a merge commit"; pass that merge commit.`,
  ])
}

let version
try {
  version = JSON.parse(must(`cannot read package.json at ${sha}`, 'git', ['show', `${sha}:package.json`])).version
} catch (error) {
  fail([`package.json at ${sha} is not valid JSON: ${error.message}`])
}
if (typeof version !== 'string' || version === '') fail([`package.json at ${sha} has no "version"`])
const tag = `v${version}`

const structure = run(process.execPath, [CHECK_CHANGELOG, '--ref', sha])
if (!structure.ok) fail([`CHANGELOG.md at ${sha} is not ready to release:`, structure.err])

const notes = run(process.execPath, [CHECK_CHANGELOG, '--ref', sha, '--notes', version])
if (!notes.ok || notes.out === '') fail([`cannot read the ${version} notes at ${sha}:`, notes.err])

must('gh is not signed in; run `gh auth login` first', 'gh', ['auth', 'status', '--hostname', host])
// Reaching the repository first gives the lookup below its meaning: GitHub
// also answers 404 for a repository the token can't see.
must(`gh cannot reach ${repository}`, 'gh', ['api', '--hostname', host, `repos/${owner}/${name}`, '--jq', '.full_name'])

// Only a 404 proves the release is absent. gh reports HTTP errors as
// "gh: <message> (HTTP <status>)"; any other failure — an outage, an expired
// token — stops here, before a tag exists.
const lookup = run('gh', ['api', '--hostname', host, `repos/${owner}/${name}/releases/tags/${encodeURIComponent(tag)}`])
if (lookup.ok) fail([`${tag} is already published as a GitHub Release in ${repository}.`])
if (!/\(HTTP 404\)/.test(lookup.err)) {
  fail([`could not confirm that ${tag} is not yet released in ${repository}:`, `  ${lookup.err || 'gh api failed'}`])
}

// The fetch above brought in every remote tag, so a local lookup covers both.
const existing = run('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}^{commit}`])
if (existing.ok && existing.out !== sha) {
  fail([`Tag ${tag} already exists at ${existing.out}, not ${sha}.`])
}

const subject = must(`cannot read ${sha}`, 'git', ['log', '-1', '--format=%s', sha])
console.log(
  [
    `Release ${version}`,
    `  repo    ${repository}`,
    `  commit  ${sha}  ${subject}`,
    `  tag     ${tag}${existing.ok ? ' (already exists here; reusing it)' : ''}`,
    '',
    notes.out,
    '',
  ].join('\n'),
)

if (dryRun) {
  console.log('Dry run: nothing was tagged, pushed or published.')
  process.exit(0)
}

// --- Effects, in an order that a re-run can resume from.

if (!existing.ok) must(`could not create tag ${tag}`, 'git', ['tag', '-a', tag, sha, '-m', `Release ${version}`])
must(`could not push ${tag} to ${REMOTE}`, 'git', ['push', '--quiet', REMOTE, `refs/tags/${tag}`])

const created = run(
  'gh',
  ['release', 'create', tag, '--repo', repository, '--verify-tag', '--title', version, '--notes-file', '-'],
  `${notes.out}\n`,
)
if (!created.ok) {
  fail([
    `${tag} is pushed, but the GitHub Release was not created:`,
    `  ${created.err}`,
    'Fix the cause and re-run the same command; it reuses the tag.',
  ])
}
console.log(created.out || `Published ${tag}.`)
