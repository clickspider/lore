# Connect any AI tool to your Lore brain

Your brain lives in your Obsidian vault, and the **MCP Connector** plugin serves
it over MCP at a local URL such as `http://127.0.0.1:27200/mcp`. Any
MCP-capable tool can read and search the project notes. Obsidian must keep
running while a local client uses the brain.

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

## GitHub Copilot (VS Code and Copilot CLI)

From the Lore repository, run:

```bash
npm run mcp:install:copilot
```

The installer reads **your own** `OBSIDIAN_MCP_URL` and
`OBSIDIAN_MCP_TOKEN` from the gitignored `.env`, then writes a private,
read-only Lore connection to `~/.copilot/mcp-config.json` with file mode `600`.
It preserves other configured MCP servers and never prints or commits your token.

Restart Copilot Chat (or run `copilot mcp list` in Copilot CLI), then ask:

```text
Use the Lore MCP tools to search the project brain. What decisions and open questions are recorded for AI Claims? Cite the note files you used.
```

For a workspace-only VS Code setup, use **MCP: Add Server** and select HTTP,
enter your local MCP URL, and supply `Authorization: Bearer <YOUR_TOKEN>`.
Do not commit `.vscode/mcp.json` when it contains a personal token.

## Cursor / Cline / Continue
Use the **Cursor / Cline / Continue** button in the MCP Connector pane, or add an
`http` MCP server with the same URL + `Authorization: Bearer <YOUR_TOKEN>`.

---

**What they can do:** use the read-only Lore tools to list and search project
brains, then open the cited Markdown notes. This is the "one brain, any harness"
promise: Slack and transcript imports write it; Copilot, Claude, Cursor, Cline,
or another MCP client can read it with receipts. Each person runs their own
Obsidian MCP Connector and uses their own token—Lore does not share private
project memory through a central server.
