---
name: ship
description: Commit all current changes with a generated message and push to GitHub. Use when the user says "ship it", "commit and push", "push my changes", or invokes /ship. Bootstraps the repo (git init, remote, first push) if it isn't set up yet. Takes an optional git remote URL as an argument to target or re-point a different repo.
---

# Ship

Stage everything, write a real commit message from the actual diff, and push.

**Argument (optional):** a git remote URL. If given, use it as `origin`.
If omitted, use the default below (or the existing `origin` if one is set).

```
DEFAULT_REMOTE = git@github.com:raviraj988/personal-website-cinematic.git
DEFAULT_BRANCH = main
```

## Procedure

### 1. Pre-flight

Run these together and read the output before doing anything else:

```bash
git rev-parse --is-inside-work-tree 2>&1
git remote -v 2>&1
git status --porcelain 2>&1
git branch --show-current 2>&1
```

If there is nothing to commit and no unpushed commits, say so and stop. Do not
create an empty commit.

### 2. Bootstrap, only if not already a repo

```bash
git init -b main
git remote add origin <URL>
```

Before the first `git add`, verify the symlink guard is working:

```bash
git check-ignore -v node_modules
```

This **must** print a matching `.gitignore` line. `node_modules` in this project
is a symlink to `../personal-website/node_modules`; git treats symlinks as
files, and the pattern `node_modules/` (trailing slash) matches directories
only. If `check-ignore` prints nothing, add a bare `node_modules` line to
`.gitignore` before staging — otherwise the symlink gets committed and the repo
breaks for anyone who clones it.

If the repo already exists and an argument URL was supplied that differs from
the current `origin`, use `git remote set-url origin <URL>` and say that you
re-pointed it.

### 3. Stage and inspect

```bash
git add -A
git status --short
git diff --cached --stat
```

Then read the staged diff itself (`git diff --cached`) — you need to know what
changed to write an honest message. For a large diff, read the stat plus the
diffs of the most substantive files.

Sanity-check the staged list before committing:

- No `node_modules`, `.next/`, `out/`, `*.tsbuildinfo`, `next-env.d.ts`,
  `.claude/settings.local.json`.
- No new large binaries. This project already carries ~17MB in `public/images`,
  including several multi-megabyte `.png` files that no code references. If a
  first commit would add those, **mention it before pushing** — binaries are
  permanent in git history — and let the user decide.
- Nothing containing a real secret, key, or token.

If anything in that list is staged, `git restore --staged <path>`, fix
`.gitignore`, and re-stage.

### 4. Commit

Write the message from the diff you just read. Format:

```
<type>: <what changed, imperative, under ~70 chars>

<optional body: why, and anything non-obvious. Wrap at 72.>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

Use `feat`, `fix`, `style`, `refactor`, `perf`, `a11y`, `chore`, or `docs`.
Describe what actually changed — never "update files" or "various changes". If
the diff spans several unrelated concerns, prefer the dominant one in the
subject and list the rest as body bullets.

The trailer is required.

### 5. Push

First push on a fresh repo:

```bash
git push -u origin main
```

Afterwards:

```bash
git push
```

If push is rejected because the remote has commits you don't (`fetch first` /
`non-fast-forward`), do **not** force. Run `git fetch origin`, report the
divergence, and ask whether to rebase (`git pull --rebase`) or merge.

If push fails on authentication, report the exact git error and suggest the user
run `! gh auth status` or `! ssh -T git@github.com` in this session to check
their credentials. Do not attempt to change their git credential config.

### 6. Report

State plainly: the commit subject, the short SHA, the branch, and the remote URL
pushed to. If you skipped or warned about anything in step 3, repeat it here.

## Rules

- Never `push --force` or `--force-with-lease` unless the user explicitly asks
  in that turn.
- Never rewrite published history (`rebase -i`, `commit --amend` on a pushed
  commit, `reset --hard`) without an explicit request.
- Never commit on behalf of the user to a branch other than the one they are on,
  and never create a branch unless asked.
- Interactive git flags are unavailable in this environment.
