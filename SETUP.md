# Lore — setup (what you paste, what I handle)

You chase **three** accounts. Everything else I wire. Paste keys into the repo
root `.env` (copy from `.env.example` first: `cp .env.example .env`).

## Keys to chase — in priority order

| # | You need | Where | Unlocks |
|---|---|---|---|
| 1 | **OpenAI API key** | https://platform.openai.com/api-keys | Capture extraction, the agent, AND Karpathy's LLM (one key covers all three) |
| 2 | **CopilotKit Intelligence key** | https://intelligence.copilotkit.ai → project → API Keys | The Slack surface (managed Channel, no tunnel) |
| 3 | **A Slack workspace** you can install an app into | your own/test workspace | Where the agent lives |

Optional model swap: OpenRouter instead of OpenAI (set `OPENROUTER_API_KEY`,
`MODEL_PROVIDER=openrouter`). **Not needed:** Exa, Ambiguous AI, Auth0 — Lore
doesn't use them.

## `.env` — paste these

```dotenv
# 1) Model (OpenAI)
MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-...            # <- paste
MODEL=gpt-5.6-sol               # or any model your account can call

# 2) CopilotKit Intelligence + Slack Channel
INTELLIGENCE_API_KEY=cpk-...     # <- paste (from Intelligence → API Keys)
CHANNEL_CODE=                    # <- filled by `npm run channel:setup` (step B)

# 4) Obsidian retrieval (local — see OBSIDIAN-SETUP.md)
OBSIDIAN_MCP_URL=http://127.0.0.1:27200/mcp   # <- paste (MCP Connector)
OBSIDIAN_MCP_TOKEN=              # <- paste (MCP Connector token)

# Where Lore writes the brain — point it at a folder inside your Obsidian vault
LORE_BRAIN_DIR=/absolute/path/to/your/Obsidian-vault/lore
```

## What I do (you don't)

- All the code + wiring + tests + the git-ledger.
- Run `npm run channel:setup` **with you** to create the managed Channel and Slack
  app — it prints `CHANNEL_CODE` and walks the Slack install. (This is step B; it
  needs your Intelligence key first.)
- Wire the Obsidian MCP into the agent (done — activates when the two `OBSIDIAN_*`
  vars are set).
- Point `LORE_BRAIN_DIR` at your vault and `git init` it so the ledger works.

## What runs without ANY keys (so we're never blocked)

- `npm run verify` — typechecks + offline tests.
- The capture → brain → git-ledger engine, via the ingestion CLI with an offline
  extractor (real cited files written, real commits). Proves the core end-to-end.

## Order of operations

1. You: paste **OpenAI** key (#1) → the ingestion/capture pipeline runs for real.
2. You: paste **Intelligence** key (#2) → we run `channel:setup` together → Slack
   surface goes live.
3. You: finish **Obsidian** ([OBSIDIAN-SETUP.md](OBSIDIAN-SETUP.md), paste the two
   `OBSIDIAN_*` vars) → retrieval/graph goes live.

Start chasing **#1 (OpenAI) and #2 (CopilotKit Intelligence)** — those are the two
that unlock the live demo.
