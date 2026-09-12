# Lore — roadmap (what's shipped, what's next)

## ✅ Shipped (working, demoed live)
- **Slack capture**: @-mention in a thread → reads it → writes a cited markdown
  entry to the vault → posts a receipt card. (`apps/channel/src/tools.tsx`)
- **Teams transcript ingest**: `npm run lore:ingest <project> <file>` →
  model-extracted, cited entries. (`packages/agent-core/src/lore/ingest.ts`)
- **Source-agnostic ingestion**: `ingestContent()` + loopback `POST /ingest`
  endpoint, so any source can feed the brain.
- **Local brain**: per-project markdown, `[[wikilinks]]`, frontmatter, citations.
- **Retrieval + graph**: delegated to the Karpathy LLM Wiki over the Obsidian MCP.
- **Change ledger**: every capture is a git commit (history; undo via `git revert`).
- **Any AI harness**: query the brain from Copilot/Claude/Cursor via the Obsidian
  MCP. (`CONNECT-YOUR-AI.md`)
- **Model routes**: free OpenAI-compatible endpoint (aptget) + Codex/ChatGPT
  subscription (OAuth). One env flip.

## 🔜 Next (parked, not built — captured 2026-09-12)
1. **Web dashboard / control center** (CopilotKit React, `apps/web`). Show project
   brains, recent captures, the git change-history, a chat box that queries the
   brain, and a link to the Obsidian graph. Biggest visible upgrade. ~few hours.
2. **Whole-channel capture** (not just one thread). @-mention Lore in a busy
   channel → read the last N messages → route each item to the right project.
   Needs channel-history read + per-item project routing. ~half day.
3. **Attachments** (PDFs / images / Office). Pull a Slack attachment → either save
   it into the vault (Karpathy already indexes those) or extract decisions from it
   into the brain. ~half day. Reuse Karpathy's multi-format ingest for retrieval.
4. **More pull adapters**: a real Microsoft Teams webhook → `POST /ingest` (the
   endpoint exists; only the Teams-side wiring is missing). Email forward → ingest.
5. **Undo UX**: expose `git revert` of a capture from the dashboard (ledger already
   makes this deterministic).
6. **Codex token refresh**: auto-refresh the OAuth token so long sessions don't
   401 mid-run (today: re-run `codex login`).

## Guardrail (do not cross)
Lore stays the **capture / routing / provenance / surfaces** layer. Retrieval, the
entity graph, dedup, and cross-project Q&A are the Karpathy LLM Wiki's job — we do
not rebuild RAG/graph retrieval here.
