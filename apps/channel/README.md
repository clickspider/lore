# Lore — the project memory that writes itself

**OpenAI + CopilotKit Channels + a local Obsidian/Karpathy brain**

Lore lives in your team chat. It reads the thread, decides what is durable — a
decision, an owner, an open question — routes it to the right project, and writes
it into a **local, git-versioned, per-project markdown brain** with a citation back
to the exact source message. Retrieval, the entity graph, and cross-project Q&A are
delegated to the **Karpathy LLM Wiki** in your own Obsidian, reached over MCP.

> Slack is the demo surface. Teams is the target — the same Channels code, a
> documented next adapter. We do not claim a live Teams integration.

## What Lore builds vs. reuses

- **Builds:** capture from Slack/Teams → cited notes, a source-agnostic
  ingestion endpoint, a git change-ledger, the CopilotKit agent + surfaces.
- **Reuses (builds zero of):** retrieval, graph, dedup, cross-project Q&A →
  the Karpathy LLM Wiki over the Obsidian MCP. The brain is portable markdown, so
  any harness (GitHub Copilot, Claude) can query it too.

## Get started

1. Root install: `npm ci` then `cp .env.example .env`.
2. Fill `.env` — see [SETUP.md](../../SETUP.md) for exactly which keys to get
   (OpenAI + CopilotKit Intelligence + a Slack workspace; Obsidian is local).
3. Connect Slack (creates the managed Channel, prints `CHANNEL_CODE`):
   ```bash
   npm run channel:setup -- --no-clipboard
   ```
   Follow the emitted prompt with the installed `channels-setup` skill; select
   Slack and reuse this `apps/channel` app. No public tunnel or Slack app token is
   needed on the managed path.
4. Run it:
   ```bash
   npm run dev:slack
   ```
   Invite the bot to a channel and @-mention it in a populated thread.

## The complete interaction

1. A few real messages land in a Slack thread ("we're moving auth from JWT to
   sessions; Dana owns it; open q: mobile refresh").
2. @-mention Lore. It calls `read_thread`, then `capture_to_brain` per item.
3. **The visible result:** a real file `LORE_BRAIN_DIR/auth-service.md` appears
   (cited, `[[wikilinked]]`), a **receipt card** renders in the thread, and the
   change is a **git commit** in the vault (`git log`; undo with `git revert`).
4. With Obsidian connected (`OBSIDIAN_*` in `.env`), ask a question — the agent
   queries the Karpathy wiki over MCP and answers with citations and the graph.

## Ingest from any source (not just Slack)

The same brain is fed by a source-agnostic ingestion core:

```bash
# A Teams meeting transcript → the brain
npm run lore:ingest "Auth Service" assets/samples/teams-standup-2026-09-12.md

# Or run the endpoint and POST content from anything (webhook, email, curl)
npm run lore:ingest-server
curl -sX POST 127.0.0.1:3141/ingest \
  -H 'content-type: application/json' \
  -d '{"project":"Auth Service","content":"...transcript or chat text..."}'
```

## Customize

| Piece | File |
|---|---|
| The brain (vault format, cited entries) | [`packages/agent-core/src/lore/brain.ts`](../../packages/agent-core/src/lore/brain.ts) |
| Ingestion core + Teams/HTTP adapters | [`packages/agent-core/src/lore/ingest.ts`](../../packages/agent-core/src/lore/ingest.ts), [`src/ingest.ts`](src/ingest.ts), [`src/ingest-server.ts`](src/ingest-server.ts) |
| Capture tools + cards | [`src/tools.tsx`](src/tools.tsx), [`src/components.tsx`](src/components.tsx) |
| Retrieval delegation (Obsidian MCP) | [`packages/agent-core/src/capabilities/obsidian.ts`](../../packages/agent-core/src/capabilities/obsidian.ts) |
| Git change-ledger | [`src/ledger.ts`](src/ledger.ts) |
| Prompt / role | [`src/prompt.ts`](src/prompt.ts) |

## Verify

`npm run verify` runs typechecks + offline tests without credentials. The brain,
ingestion, and ledger are covered offline; live Slack delivery, model extraction,
and Obsidian retrieval need your accounts and are demonstrated separately.

Keep the pinned Channels/runtime pair and the `@ag-ui/client` override. The
[Channels skill](../../.agents/skills/build-channels-agent/SKILL.md) is the
verified API reference.
