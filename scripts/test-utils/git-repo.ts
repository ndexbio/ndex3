import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

/**
 * Environment for git in tests: a fixed identity, and no global or system
 * config, so a developer's settings (commit signing, default branch, hooks)
 * can't change the outcome.
 */
export const GIT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
}

/** The URL `origin` is configured with, as a real clone's would be. */
export const ORIGIN_URL = 'https://github.com/test-owner/test-repo.git'
/** The same repository in the `HOST/OWNER/REPO` form gh's --repo takes. */
export const ORIGIN_REPOSITORY = 'github.com/test-owner/test-repo'

const gitIn = (cwd: string, args: string[]) =>
  execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' }).trim()

export type GitRepo = {
  /** The working clone; run scripts with this as their cwd. */
  work: string
  /**
   * A bare repository standing in for GitHub. `origin` is configured as
   * ORIGIN_URL, and git rewrites that URL to this path for fetch and push.
   */
  origin: string
  git: (...args: string[]) => string
  /** Writes the files (null deletes one), commits everything, returns the sha. */
  commit: (files: Record<string, string | null>, message?: string) => string
  /** The commit a tag on `origin` points at, or '' if it doesn't exist there. */
  remoteTag: (tag: string) => string
}

/** A fresh repository on `main` with an empty bare `origin`, under `root`. */
export const createRepo = (root: string): GitRepo => {
  const origin = path.join(root, 'origin.git')
  const work = path.join(root, 'work')
  gitIn(root, ['init', '--quiet', '--bare', '-b', 'main', origin])
  gitIn(root, ['init', '--quiet', '-b', 'main', work])
  gitIn(work, ['remote', 'add', 'origin', ORIGIN_URL])
  gitIn(work, ['config', `url.${origin}.insteadOf`, ORIGIN_URL])

  const git = (...args: string[]) => gitIn(work, args)
  return {
    work,
    origin,
    git,
    commit: (files, message = 'change') => {
      for (const [file, content] of Object.entries(files)) {
        const full = path.join(work, file)
        if (content === null) {
          fs.rmSync(full)
        } else {
          fs.mkdirSync(path.dirname(full), { recursive: true })
          fs.writeFileSync(full, content)
        }
      }
      git('add', '--all')
      git('commit', '--quiet', '-m', message)
      return git('rev-parse', 'HEAD')
    },
    remoteTag: (tag) => {
      const lines = gitIn(root, ['ls-remote', '--tags', origin, `refs/tags/${tag}`, `refs/tags/${tag}^{}`])
      if (lines === '') return ''
      // An annotated tag lists its own object and then, with ^{}, the commit.
      const rows = lines.split('\n').map((l) => l.split('\t'))
      return (rows.find(([, name]) => name.endsWith('^{}')) ?? rows[0])[0]
    },
  }
}
