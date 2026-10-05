---
name: groom-ticket
description: Grooms one ticket from the configured Plane project. Claims the highest-priority "To Do" ticket by moving it to Grooming, checks Plane and repo context, then moves it to Ready for Dev or Pending Clarification (with precise questions). Use when asked to groom, triage, refine or review requirements of tickets or work items, or when run under /loop. Read-only on the repo; never implements code.
---

# Groom Ticket

Requirements-grooming stage of an AI dev workflow. Decide whether one ticket is clear enough for an implementation agent to build without inventing a material requirement.

```
To Do → Grooming (claim/lock) → Ready for Dev | Pending Clarification
```

`PLANE_PROJECT_ID=e9a89a0e-3f49-4c41-bfd8-eb5abee3be8a` is the only project this skill touches. Never substitute another.

## Hard rules

- One ticket per invocation. Plane is the source of truth for state.
- Claim (`To Do → Grooming`) before any analysis. The state change is the lock that stops concurrent `/loop` runs picking the same ticket.
- Every claimed ticket ends in `Ready for Dev` or `Pending Clarification`, never `Grooming`, unless an error prevents it (then report the actual state).
- Read-only on the repo: no edits, branches, commits or PRs. Never move a ticket to `In Progress`.
- Never invent product, business, security or API-contract requirements. Settle minor details from repo conventions.
- No secrets or credentials in comments or output.

## Tools

Plane calls the unit of work a "work item"; this skill says "ticket". Use the Plane MCP tools by their full names, because short names can fail to resolve when several MCP servers are connected:

- `mcp__claude_ai_Plane__state`: list the project's states and get their IDs.
- `mcp__claude_ai_Plane__workitem`: list, retrieve and update (state changes) tickets.
- `mcp__claude_ai_Plane__workitem_comment`: read and post comments.
- `mcp__claude_ai_Plane__workitem_relation`, `workitem_link`, `workitem_attachment`: related tickets, links, attachments.

If a tool's parameters are unclear, check its schema before calling instead of guessing.

## Steps

Copy this checklist and tick items off as you go:

```
- [ ] 1. Validate states
- [ ] 2. Select ticket
- [ ] 3. Claim (To Do → Grooming)
- [ ] 4. Gather context
- [ ] 5. Decide
- [ ] 6. Comment once, transition once, confirm state
```

1. **Validate.** Confirm the project is accessible and has states `To Do`, `Grooming`, `Ready for Dev`, `Pending Clarification`. If anything is missing, change nothing, report it, and stop. Never substitute another state.
2. **Select.** List `To Do` tickets in the project only. Pick by highest priority, then Plane sequence/order, then oldest created. Don't rely on API ordering. If none, stop with the "No work" response.
3. **Claim.** Re-read the ticket and confirm it is still `To Do`. If not, stop silently (no comment, no transition). Move it to `Grooming` and confirm. If the move fails and the state isn't confirmed as `Grooming`, stop.
4. **Gather context.**
   - Plane: description, acceptance criteria, comments (prior human answers count as answers), labels, priority, parent/epic/module, related tickets, links and attachments.
   - Repo: `CLAUDE.md`, `AGENTS.md`, README, CONTRIBUTING, `docs/`, plus any more specific instruction files near the relevant code.
   - Code: read only the smallest relevant slice (routes, components, models, schemas, API clients, config, tests). Aim to learn how the system works today, whether the behavior already exists, which conventions apply, and whether the ticket conflicts with current behavior.
5. **Decide.** Ready for Dev if a competent engineer/AI-coding agent could implement it without making a material decision. Otherwise Pending Clarification.

   Ask only when an unresolved gap would materially change: product behavior, business rules (e.g. a discount with no percentage or eligibility), user-visible behavior, API contract or external integration, data semantics or lifecycle, destructive-operation behavior (soft or hard delete, recoverability, cascades), authorization/security, or acceptance criteria. Also ask when the description and acceptance criteria conflict. Don't pick one arbitrarily.

   Don't ask about anything the repo answers: naming, file layout, formatting, test framework, validation, error handling, pagination, UI patterns, architecture. The goal is safe implementation, not a perfect spec, so use engineering judgment on minor details.

   If repo context essential to the decision is unavailable, don't mark it ready. Use Pending Clarification and say what context is missing.

6. **Comment once, then transition once.** Before commenting, check recent comments: reuse any existing answers, and don't repeat a question that is already asked and unanswered (just transition). Confirm the ticket is still `Grooming`, post one comment, then make one transition, then confirm the new state. Never go directly from `To Do`.

   Ready for Dev comment:

   ```markdown
   ## AI Grooming

   **Decision:** Ready for Dev

   ### Understanding

   <short, implementation-oriented summary>

   ### Key constraints

   - ...

   ### Acceptance criteria understood

   - ...

   ### Relevant context

   - <existing convention/implementation that applies>
   ```

   Clarification comment:

   ```markdown
   ## AI Grooming — Clarification Required

   ### Questions

   1. <specific, answerable question>

   ### Why this is required

   <one or two sentences on how the answer changes behavior>
   ```

   Questions must be specific and minimal.

   - Bad: "Please provide more details."
   - Good: "When a job posting is deleted, should its applications be deleted or retained for audit?"

## Failures

Never claim success that isn't confirmed, and keep the safest known state.

- Comment posted, transition unknown: re-read the ticket. If it is still `Grooming`, retry the transition once.
- Transition done, comment failed: don't retry the comment. The state is authoritative, so report the failure.
- Repo search failed: don't assume anything about code you couldn't see. If it's material, use Pending Clarification.

## Final response

Keep it to the matching block:

```
Ticket: <id/title>
Decision: READY_FOR_DEV | PENDING_CLARIFICATION
Action: To Do → Grooming → <final state>
Reason / Questions: <one line>
```

No work: `No eligible To Do ticket found in Plane project <PLANE_PROJECT_ID>.`
Failure: `Ticket: <id/title if known> | Decision: NOT_PROCESSED | Reason: <short> | Current state: <actual>`
