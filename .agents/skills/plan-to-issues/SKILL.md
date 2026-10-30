---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Ask the human what every issue here must carry (fields, labels, wording), unless it is
   already written down in this session or in the repo. The shape below is the default; ask only
   about changes to it.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

A `closes #n` commit pushed to the default branch closes the issue without that comment. Close
with the comment first, or add it after with `gh issue comment <n>`.

## What every issue carries

Agreed with the human on the morning-digest plan (2026-10-29). Label: `plan:<plan name>` from
plan.md's frontmatter; create it with `gh label create` if it's missing. Body:

```md
Source: plan.md § <n>

## Scope
<what to change, in the plan's words; which files>

## Done when
<the plan's condition, checkable>

## Blocked by
#<n> / none (can start on #<n>; needs #<m> merged to meet Done when)

## Worker
model: strongest | cheaper · one issue per worker, own branch
Close with the AGENTS.md comment: `done:` / `worker:` / `commit:`
```

- `Source:` is the first line, always: reviewers sort by it.
- A plan section may become two issues when part of it unblocks others (a shared type, a
  contract). Both carry the same `Source:`.
- A Done when that depends on someone else (a reviewer, an upload, a reply) holds only once they
  have acted. Say so in the issue, and leave it open until then: anything blocked by it waits too.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
