#!/usr/bin/env node
/**
 * Fails when documentation points at something that no longer exists.
 *
 * Two classes of rot, both silent without this check:
 *   - a `src/…` path named in prose after the file was moved or renamed
 *   - a relative Markdown link to a document that was deleted
 *
 * It deliberately does NOT check line numbers, because documentation should not
 * cite them: a line range stays "valid" while silently pointing at different
 * code, which is worse than a broken link. Any `path:123` reference is reported
 * so it can be replaced with a symbol name.
 *
 * Only documents declaring `status: current` in front matter are enforced. A
 * design or historical document legitimately names components that do not exist
 * — proposed, or since removed — so those are reported as warnings. This is what
 * makes the `status` field earn its place rather than decorate the file.
 *
 * Fenced code blocks are skipped: directory trees are illustrative, not claims.
 *
 * Usage: node scripts/check-docs-links.js [dir ...]   (default: docs)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const roots = process.argv.slice(2)
const searchDirs = roots.length > 0 ? roots : ['docs']
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Every markdown file under the given directories. */
const markdownFiles = (dir) => {
  const out = []
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md')) out.push(full)
    }
  }
  walk(dir)
  return out
}

/** `status:` from YAML front matter, if the document declares any. */
const statusOf = (text) => {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return null
  const status = fm[1].match(/^status:\s*(\S+)/m)
  return status ? status[1] : null
}

/** Blanks out fenced code blocks so illustrative trees are not read as claims. */
const withoutCodeBlocks = (text) =>
  text.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))

// `src/lib/utils/network-status.ts`, with or without a trailing :line
const SOURCE_PATH = /(?<!\w)(src\/[A-Za-z0-9/_.()-]+\.(?:tsx?|jsx?|css|json))(:\d+(?:-\d+)?)?/g
// [text](./relative/path.md) — skips URLs and anchors
const MD_LINK = /\[[^\]]*\]\((?!https?:|mailto:|#)([^)]+)\)/g

const problems = []
const warnings = []

for (const dir of searchDirs) {
  if (!fs.existsSync(dir)) {
    problems.push(`${dir}: directory does not exist`)
    continue
  }

  for (const file of markdownFiles(dir)) {
    const raw = fs.readFileSync(file, 'utf8')
    const text = withoutCodeBlocks(raw)
    const rel = path.relative(repoRoot, file)
    const enforced = statusOf(raw) === 'current'

    for (const [, srcPath, lineRef] of text.matchAll(SOURCE_PATH)) {
      if (!fs.existsSync(path.join(repoRoot, srcPath))) {
        const message = `${rel}: references missing file  ${srcPath}`
        if (enforced) problems.push(message)
        else warnings.push(`${message}  (not enforced: status is not "current")`)
      }
      if (lineRef) {
        warnings.push(
          `${rel}: cites a line number (${srcPath}${lineRef}) — name the symbol instead, line numbers rot silently`,
        )
      }
    }

    for (const [, link] of text.matchAll(MD_LINK)) {
      const target = link.split('#')[0]
      if (!target) continue
      if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
        // A broken link is always an error: unlike a source path, it can never
        // be a forward reference.
        problems.push(`${rel}: broken link  ${link}`)
      }
    }
  }
}

for (const w of warnings) console.warn(`warning  ${w}`)

if (problems.length > 0) {
  console.error(`\n${problems.length} documentation problem(s):\n`)
  for (const p of problems) console.error(`  ${p}`)
  console.error('')
  process.exit(1)
}

const checked = searchDirs.join(', ')
console.log(
  `Documentation links OK (${checked})${warnings.length ? `, ${warnings.length} warning(s)` : ''}`,
)
