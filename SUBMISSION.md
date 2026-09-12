# Lore — submission

> **Status: core PROVEN LIVE (2026-09-12).** A real @-mention in Slack captured a
> cited open-question into `lore/billing.md` on disk (receipt card shown the file
> path + the Slack message citation), and the Karpathy LLM Wiki answered "what did
> we decide about the Auth Service?" in Obsidian with `[[wikilink]]` citations back
> to Lore's notes. Both ran on the free (aptget) model — no paid key. The 2-minute
> video records exactly this flow.

## Project

**Title:** Lore — the project memory that writes itself.

**One line:** Lore lives in your team chat, turns the conversations you're already
having into a living, **cited**, per-project markdown brain, and lets any AI tool
answer "what did we decide about X?" with receipts.

**Who it is for:** an engineer / tech lead juggling several projects on Microsoft
Teams — especially in regulated shops where shipping transcripts to a cloud AI is a
non-starter.

**Why the surrounding context matters:** the agent lives *inside the thread*. It
reads what was actually said, decides what is durable (a decision, an owner, an
open question), routes it to the right project, and cites the exact source message.
Remove the conversation context and there is nothing to capture — a standalone
chatbox would just ask you to re-type everything you already said.

## Build eligibility — inherited vs. built during the event

**What we inherited (starter code, unchanged in spirit):**
- The CopilotKit **Agents, Everywhere** starter kit (Slack/Channels app, shared
  `agent-core` model adapter, managed-gateway test harness, build tooling). Our
  repo's first commit is this starter, verbatim, labelled as inherited boilerplate.
- CopilotKit **Channels** + **Intelligence**, the OpenAI model adapter, and the
  `@ag-ui/*` stack — used as building blocks.

**What we built during the hackathon (all commits after the baseline):**
- **The brain** — a local-first, git-versioned, per-project markdown vault with
  cited entries and `[[wikilinks]]` (`packages/agent-core/src/lore/`).
- **Capture** — Channels tools `read_thread` + `capture_to_brain` that read the
  live thread and write cited knowledge to the brain; a deterministic receipt card
  and an agent-rendered `lore_card` (`apps/channel/src/tools.tsx`, `components.tsx`).
- **Source-agnostic ingestion** — `ingestContent()` + a Teams-transcript CLI
  (`npm run lore:ingest`) + a loopback `POST /ingest` endpoint, so any source can
  feed the brain (`packages/agent-core/src/lore/ingest.ts`, `apps/channel/src/ingest*.ts`).
- **Lore's prompt/role and the Channels wiring** for this domain.
- Reworked tests for the new domain.

**The honest proof:** `git diff origin/main HEAD` is exactly our event work — the
baseline is the untouched starter.

## What we deliberately did NOT build (reuse, not reinvent)

- **Retrieval, the entity/concept graph, cross-project Q&A, curation** → delegated
  to the **Karpathy LLM Wiki** (Obsidian plugin / `karpathywiki-cli`), reached over
  the **Obsidian MCP**. Lore writes the cited source notes; Karpathy builds the
  graph and answers. We hold a hard line: no embeddings, no PageRank, no graph
  retrieval in Lore.
- Generic vault read/write for external agents → the same Obsidian MCP, so any
  harness (GitHub Copilot, Claude) can query the brain.

## Sponsor technologies used

| Tool | Visible contribution |
|---|---|
| **OpenAI** | The model behind capture extraction and the agent. |
| **CopilotKit Channels + Intelligence** | The agent lives in the Slack thread; native `lore_card`; managed connection, no tunnel. |
| _(ecosystem, not sponsors)_ | Obsidian + Karpathy LLM Wiki + Obsidian MCP provide retrieval/graph on top of the portable markdown brain. |

Exa, Ambiguous AI, and Auth0 from the kit are **not used** — Lore is local-first
and reads internal context, not the public web or a cloud record. Their starter
code remains, unregistered.

## Surfaces — honest scope

- **Slack** — the demo surface (Channels). Live.
- **MCP → any harness** — query the brain from GitHub Copilot / Claude via the
  Obsidian MCP. Live once Obsidian is configured.
- **Web** — a CopilotKit React control-center (chat + change history) is a planned
  stretch; marked clearly if not in the final video.
- **Teams** — the real target. Channels is platform-agnostic, so Teams is a
  documented next adapter. **We do not claim a live Teams integration.**

## Evidence for the judging criteria

| Criterion | Evidence |
|---|---|
| Core Requirements & Functionality | Capture a decision from a live Slack thread → a real cited file appears in the vault (git-committed) → query it back with a receipt. |
| Innovation & Theme Alignment | The thread *is* the input; the brain is portable markdown that an existing best-in-class tool (Karpathy) builds a graph on. Remove the thread and there is nothing to capture. |
| Technical Execution & Integration | Channels + OpenAI + the local vault + the Obsidian MCP work together; capture failures return an error and claim nothing was saved; retrieval degrades gracefully when Obsidian is not connected. |
| Usefulness & Agentic Experience | Zero note-taking: the by-product of a conversation becomes cited, queryable memory, auditable via git, with the human able to edit or revert any change. |

- [ ] Live Slack capture recorded (real file written + git-committed)
- [ ] Query answered via the Obsidian MCP with citations
- [ ] A failure path shown (capture error, or query with Obsidian disconnected)
- [ ] Sample data / session state / live services labelled in the video

## Repository & quickstart

- Public repo: `github.com/clickspider/lore` (private during the build).
- Clean-clone quickstart, required credentials, and the separate processes
  (Channels listener, ingest, Obsidian) are documented in
  [apps/channel/README.md](apps/channel/README.md). `npm run verify` runs
  typechecks + offline tests without credentials.
- `.env`, tokens, and the vault contents stay out of the repo, logs, and video.

## Deliverables checklist

- [ ] Title + written description (above)
- [ ] Public repo + run instructions
- [ ] Two-minute demo video (one complete Slack interaction, visible result)
- [ ] Social post tagging the partners per organizer instructions

_Prepared for a human to publish. Running the kit does not publish or submit._
