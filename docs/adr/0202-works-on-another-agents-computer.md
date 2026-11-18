# 0202. An agent works on another agent's computer

- Status: Accepted (built). Decided by user instruction and debated defaults, not by an owner decision.
- Date: 2026-11-18
- Extends: 0148 (an agent's line, which this is not), 0175 (a request carrying an id that is not the agent's own)
- Amends: 0057 (files, sign-ins, browser profiles and processes belong to each agent's own user: not for an agent a
  person put on another's computer), 0096 (an agent reaches only its own slice's ports: a member's request is its
  lead's), 0059 §2 (the invariant that no agent that doesn't think with an account can read it: a member's AI account
  stays lent to its lead's user while linked)
- Code: `packages/engine/src/works-on.ts` (`resolveWorksOn`, `worksOnScope`, `setWorksOn`, `membersOf`, `worksOnViews`,
  `stopMembersWork`), `agents.works_on_agent_id` (migration 0306), `PUT …/agents/{agentId}/works-on`
  (`apps/server/src/routes/machines.ts`), web `AgentComputerPanel` (`apps/web/src/components/AgentComputer.tsx`), phone
  `apps/mobile/src/features/agents/WorksOnSection.tsx`, the rule shared by both `packages/client/src/lib/works-on.ts`.

## Context

A lead agent set up a computer: a folder with the checkouts, what is installed, the services it runs. Other agents of the
same person should work there without setting all of it up again. Each agent's own OS user, folder, ports and sign-ins
(ADR 0057, 0096) made every agent start from nothing.

## Decision

On agent M a person sets "Works on the computer of" agent L (the words in the apps never say "lead": that word is a
setor's person, ADR 0083). From then on, on L's computer M works as L does there: L's OS user, folder, installed
programs, services and ports, browser, desktop and the sign-ins in L's environment. M stays its own agent everywhere
else: its sidebar entry, name, instructions, memory, conversations, model, its own AI sign-in, budget and approvals.
The default is unset: nothing changes for any agent until a person sets it. No workspace switch.

How it works:

- One rule, `resolveWorksOn` (`works-on.ts`). Every machine request M makes carries L's `id` and `handle` (the runner
  derives everything from them), with M's name. M's brain turns keep M's own session ids. `machineScope` and
  `agentScopeFromDb` call it, as do the places that build a scope by id (`agentScopeOn`: folder grants, holds, the
  browser's warm and act, a person's view of an agent's computer).
- The link is honored only while L is a live agent of the same non-null owner, is not a member itself, is not the right
  hand, and M, L and the computer the request goes to are the same one. Otherwise the request is refused, naming L, and
  never runs as M's own user. L's hold refuses M's work and says whose it is; M's own hold is its own.
- The hub (`outgoing()`) takes the name and the `Co-authored-by` line from M's row and removes the member field before
  the request goes out: commits stay M's, no protocol change.
- Setting it: whoever owns or manages both agents (a plain owner may link their own two), and, to put M on L's computer,
  the setter's computer rule. Same owner, one level (L works on no one; an agent with any member, archived ones too,
  works on no one), never the right hand or an archived agent, and L has a computer. Linking moves M onto L's computer
  in the same transaction and clears its AI account there, as any move does. Clearing needs only managing M.
- Placement: M chooses no computer of its own while linked (`setAgentComputerTarget` refuses, bulk moves skip it,
  `works_on`). L's move takes its members along in one transaction and wakes their waiting runs. Lead archived: its
  members' tasks are cancelled and their requests refused while it is, the link kept. Lead deleted: the links are
  cleared and M keeps its computer with its own identity. A writer that moves agents without the cascade (a removed
  computer) is caught at resolve time by the same-computer check.
- Sign-ins: L's frame entry lists its members' AI accounts, so the runner's keep set never closes M's process or task,
  and M's own entry stays with no account, so the folder lent to L's user is never taken back for M's. **A member's AI
  account stays lent to L's OS user while linked**, not only during M's turn (amends 0059 §2): the same owner bounds it.
- The apps say it plainly: on that computer M can do what L can, including using L's sign-ins and files there; its own AI
  account, memory and name stay its own; approvals for sensitive actions still go to people.

## What differs from ADR 0094

0094 rejected moving agents to the setup's computer. This is opt-in per agent, by a person who owns both, follows the
lead's computer, and gives M the lead's identity on that computer only: nothing is moved or chosen for anyone.

## Consequences

- One warm model process per lead's id and runner: a lead and its members alternating turns restart each other's idle
  process (cold start, lost prompt cache). A running turn is never closed for another's. Accepted.
- M's commits carry M's name but git branches under `agentes/<lead handle>/` are the folder's: M may push there and not
  under `agentes/<its handle>/`.
- Rolled back to code without this: the column is ignored, M works as its own user again with a new folder; files it made
  in L's folder stay there.
- Known limits: a person watching a member's browser live, a desktop handoff's seat and the phone's device tools still use
  the member's own id (see the PR's list); the two-agents-one-system-computer path is reasoned from code, not run on a
  real system-mode computer.
