# Connect any AI tool to your Lore brain

Your brain lives in your Obsidian vault, and the **MCP Connector** plugin already
serves it over MCP at `http://127.0.0.1:27200/mcp`. Any MCP-capable tool can read
your notes + query the Karpathy graph. Obsidian keeps running = brain is live.

> Keep Obsidian open with the MCP Connector enabled. Your token is in the
> MCP Connector "Lore Core" pane (and in your repo `.env` as `OBSIDIAN_MCP_TOKEN`).

## Easiest: let Obsidian generate the config for you
In Obsidian → **Settings → MCP Connector → your token pane**, click the button for
your tool: **Claude Desktop**, **Claude Code**, **Cursor / Cline / Continue**, or
**.mcpb**. It copies a ready-to-paste config. Paste where noted below.

## Claude Code (CLI)
```bash
claude mcp add --transport http lore http://127.0.0.1:27200/mcp \
  --header "Authorization: Bearer <YOUR_TOKEN>"
```
Then in a Claude Code session: *"read wiki/index.md and tell me what we decided
about the Auth Service."*

## Claude Desktop
`~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "lore": {
      "type": "http",
      "url": "http://127.0.0.1:27200/mcp",
      "headers": { "Authorization": "Bearer <YOUR_TOKEN>" }
    }
  }
}
```

## GitHub Copilot (VS Code, Agent mode)
Create `.vscode/mcp.json` in your project:
```json
{
  "servers": {
    "lore": {
      "type": "http",
      "url": "http://127.0.0.1:27200/mcp",
      "headers": { "Authorization": "Bearer <YOUR_TOKEN>" }
    }
  }
}
```
Open Copilot Chat → **Agent** mode → it can now read/search your vault + wiki.

## Cursor / Cline / Continue
Use the **Cursor / Cline / Continue** button in the MCP Connector pane, or add an
`http` MCP server with the same URL + `Authorization: Bearer <YOUR_TOKEN>`.

---

**What they can do:** read your project brains, search, and ask the Karpathy wiki
questions — every answer carries `[[wikilinks]]` back to the source note Lore
wrote. This is the "one brain, any harness" promise: Slack writes it, and Copilot
or Claude read it, with receipts.
