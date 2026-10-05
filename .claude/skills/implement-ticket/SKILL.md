---
name: implement-ticket
description: Implements one "Ready for Dev" ticket from the configured Plane project end to end. Claims the highest-priority unblocked ticket by moving it to In Progress, builds it on a dedicated branch, validates it, opens a pull request, then moves it to Code Review (or to Blocked or Pending Clarification with a precise comment if it cannot be finished). Use when asked to implement, build, fix or pick up the next ticket or work item, or when run under /loop. Follows groom-ticket, which produces the Ready for Dev tickets.
---

# Implement Ticket

Implementation stage of an AI dev workflow. Take one groomed ticket and turn it into a reviewable pull request without inventing requirements.

```
Ready for Dev → In Progress (claim/lock) → Code Review | Blocked | Pending Clarification
```

`PLANE_PROJECT_ID=e9a89a0e-3f49-4c41-bfd8-eb5abee3be8a` is the only project this skill touches. Never substitute another.

## Hard rules

- One ticket per invocation. Plane is the source of truth for state.
- Claim (`Ready for Dev → In Progress`) before touching code. The state change is the lock that stops concurrent `/loop` runs picking the same ticket.
- Every claimed ticket ends in `Code Review`, `Blocked` or `Pending Clarification`, never left in `In Progress`, unless an error prevents it (then report the actual state).
- Never move a ticket to `Done`. A human merges the PR and closes the ticket.
- Never push to or commit on `main` (or the default branch), never force-push, never merge the PR.
- Never invent product, business, security or API-contract requirements. If the ticket is unclear, ask (see "Stopping early"); minor details follow repo conventions.
- Stay in scope: implement what the ticket asks, not adjacent refactors or extras.
- No secrets or credentials in code, comments, commits or output.

## Tools

Plane calls the unit of work a "work item"; this skill says "ticket". Use the Plane MCP tools by their full names, because short names can fail to resolve when several MCP servers are connected:

- `mcp__Plane__state`: list the project's states and get their IDs.
- `mcp__Plane__workitem`: list, retrieve and update (state changes) tickets.
- `mcp__Plane__workitem_comment`: read and post comments.
- `mcp__Plane__workitem_relation`, `workitem_link`, `workitem_attachment`: blockers, related tickets, links, attachments.

Use `git` and `gh` through Bash. If a tool's parameters are unclear, check its schema before calling instead of guessing.

## Steps

Copy this checklist and tick items off as you go:

```
- [ ] 1. Validate states
- [ ] 2. Select unblocked ticket
- [ ] 3. Preflight (read-only)
- [ ] 4. Claim (Ready for Dev → In Progress)
- [ ] 5. Branch
- [ ] 6. Plan, implement
- [ ] 7. Validate (fix and re-run until green)
- [ ] 8. Self-review (fix and re-validate)
- [ ] 9. Commit, push
- [ ] 10. Open PR
- [ ] 11. Comment once, move to Code Review, confirm state
```

1. **Validate.** Confirm the project is accessible and has states `Ready for Dev`, `In Progress`, `Code Review`, `Pending Clarification`. `Blocked` is optional. If a required state is missing, change nothing, report it, and stop. Never substitute another state.

2. **Select.** List `Ready for Dev` tickets in the project only. Skip any ticket blocked by an unfinished ticket (check Plane relations such as "blocked by"; a blocker in `Done` or `Cancelled` doesn't count). Of the rest, pick by highest priority, then Plane sequence/order, then oldest created. Don't rely on API ordering. If none, stop with the "No work" response and leave Plane untouched.

3. **Preflight (read-only).** Understand before claiming, so a ticket that turns out to be unclear never sits in `In Progress`.
   - Plane: description, acceptance criteria, all comments (especially the `## AI Grooming` comment and any human answers), labels, parent/epic, related tickets, links and attachments.
   - Repo: `CLAUDE.md`, `AGENTS.md`, README, CONTRIBUTING, `docs/`, and any more specific instruction files near the relevant code.
   - Code: the existing implementation the change touches, its neighbours, and the relevant tests. Learn the conventions you must match.
   - Check the working tree with `git status`. Unrelated uncommitted changes belong to the user; leave them alone and keep them out of your commits.

   If a material requirement is still unclear, go to "Stopping early" instead of continuing.

4. **Claim.** Re-read the ticket and confirm it is still `Ready for Dev`. If not, stop silently (no comment, no transition). Move it to `In Progress` and confirm. If the move fails and the state isn't confirmed, stop.

5. **Branch.** Update the default branch from `origin`, then create a dedicated branch from it named after the ticket identifier plus a short slug (e.g. `tj-12-job-search-filters`). If the branch already exists from an earlier attempt, inspect it before reusing. Never work directly on the default branch.

6. **Plan, then implement.** Write a short plan (files to change, approach, tests to add) before editing, and keep it tied to the acceptance criteria. Then implement in small steps, matching the surrounding code's naming, structure, comment density and idiom. Add or update tests wherever the repo has a test setup that fits the change.

7. **Validate.** Run the checks the repo defines, discovered from `package.json` scripts, README or CI config (for `tjnext`: `pnpm lint` and `pnpm build`, plus tests if present). Then verify the behavior against each acceptance criterion; passing lint/build alone doesn't prove the feature works. For UI work, run the app and exercise the change if possible. Report honestly what you ran and what you couldn't run.

8. **Self-review.** Read your own `git diff` as a reviewer would: stray debug code, unrelated edits, missing edge cases, unmet acceptance criteria, security issues, files that shouldn't be committed (`.env`, build output, `.claude/`). Fix what you find and re-validate; repeat until the diff is clean. Use the `code-review` skill on the diff if available.

9. **Commit and push.** Stage files explicitly (not `git add -A`) so unrelated changes stay out. Commit with a clear message that references the ticket identifier, ending with the attribution line the environment specifies. Push the branch.

10. **Open the PR** with `gh pr create` against the default branch. Title references the ticket identifier. Body covers: link/identifier of the Plane ticket, what changed and why, how it was validated, and anything a reviewer should look at closely or that was deliberately left out. End with the attribution line the environment specifies.

11. **Comment once, then transition once.** Confirm the ticket is still `In Progress` and the PR exists. Post one comment, then move `In Progress → Code Review` and confirm the new state. Only do this after implementation, validation, self-review, push and PR creation have all succeeded.

    ```markdown
    ## AI Implementation

    **PR:** <url>
    **Branch:** `<branch>`

    ### What changed

    - ...

    ### Validation

    - <command or manual check> — <result>

    ### Notes for reviewer

    - <judgment calls, follow-ups, anything not verified>
    ```

## Stopping early

Don't produce a misleading PR. Stop, explain, and leave the ticket in the honest state.

**Unclear requirement.** Found in preflight (before claiming) or mid-implementation. Ask only about things that would materially change behavior: product or business rules, API contracts, data semantics, destructive-operation behavior, authorization/security, or conflicting acceptance criteria. Never ask what the repo answers. Before commenting, check recent comments so you don't repeat an unanswered question. Post one comment with specific, minimal questions, then move the ticket to `Pending Clarification` (from `Ready for Dev` or `In Progress`, whichever it is in).

```markdown
## AI Implementation — Clarification Required

### Questions

1. <specific, answerable question>

### Why this is required

<how the answer changes the implementation>
```

**Technical blocker.** Implementation or validation keeps failing. For each failure: diagnose, make a reasonable fix, re-run validation, and continue only while there is credible progress. If the same fundamental blocker survives a few honest attempts, stop; never loop endlessly. Post one comment with what failed, what was tried, and what is needed to continue, then move the ticket to `Blocked` if that state exists, otherwise `Pending Clarification`. Leave any partial work on the local branch and say so; don't open a PR for work that doesn't meet the acceptance criteria (a draft PR is acceptable only if the comment explains why).

```markdown
## AI Implementation — Blocked

### Blocker

<what is failing, with exact error text if short>

### Attempted

- ...

### Needed to continue

- ...
```

An unclear-requirement stop in preflight happens before any branch or code change exists, so nothing is pushed. In every case the ticket ends in a state other than `In Progress`.

## Failures

Never claim success that isn't confirmed, and keep the safest known state.

- Comment posted, transition unknown: re-read the ticket. If the state is still `In Progress`, retry the transition once.
- Transition done, comment failed: don't retry the comment. The state is authoritative, so report the failure.
- Push or PR creation failed: don't move to `Code Review`. Retry once; if it still fails, treat it as a blocker and report the branch and local commit so work isn't lost.
- Plane unreachable after claiming: finish nothing silently; report the actual state and the branch/PR so a human can reconcile.

## Final response

Keep it to the matching block:

```
Ticket: <id/title>
Outcome: CODE_REVIEW | PENDING_CLARIFICATION | BLOCKED
Action: Ready for Dev → In Progress → <final state>
PR: <url or none>
Summary / Questions / Blocker: <one or two lines>
```

No work: `No eligible Ready for Dev ticket found in Plane project <PLANE_PROJECT_ID>.`
Failure: `Ticket: <id/title if known> | Outcome: NOT_PROCESSED | Reason: <short> | Current state: <actual>`
