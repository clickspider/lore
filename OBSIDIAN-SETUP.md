# Connect Lore to Obsidian

Lore keeps its project brain as plain Markdown inside an Obsidian vault. The
complete local-first setup uses two community plugins:

1. **[MCP Connector (istefox)](https://community.obsidian.md/plugins/mcp-tools-istefox)**
   is required. It exposes your local vault to GitHub Copilot and other MCP
   clients at `http://127.0.0.1:27200/mcp`.
2. **[Karpathy LLM Wiki](https://community.obsidian.md/plugins/karpathywiki)**
   is required for Lore's generated entity pages, knowledge graph, and
   Obsidian-native wiki Q&A.

## Copilot-only route

If GitHub Copilot is the only AI service available on this laptop, install and
configure **MCP Connector**. Copilot in VS Code can then search and cite the
existing Lore Markdown brain without an OpenAI key.

Karpathy LLM Wiki still needs a model provider to generate or refresh the wiki
graph. GitHub Copilot is not a provider for that plugin. Configure a permitted
local provider such as Ollama or LM Studio if your company policy allows it, or
use an approved API provider. Without one, keep the plugin installed but use
Copilot's MCP connection for read/search Q&A.

The Lore web chat, live Slack/Teams capture, and AI extraction likewise need a
model provider configured in Lore's `.env`; they do not use a GitHub Copilot
subscription.

## Setup

1. Install Obsidian desktop and create or open a vault. Create a `lore/` folder
   inside that vault for Lore's cited Markdown brain.
2. In Obsidian, open **Settings → Community plugins → Browse**. Install and
   enable **MCP Connector** and **Karpathy LLM Wiki** from the links above.
3. Configure Karpathy LLM Wiki with a permitted provider, then use **Test
   Connection** before saving. This is what enables wiki generation and the
   graph. If you are Copilot-only, skip this step for now.
4. Open **Settings → MCP Connector → Access control**. Create a token named
   `Lore`, then copy the local MCP URL and token.
5. In Lore's repository-root `.env`, set:

   ```dotenv
   OBSIDIAN_MCP_URL=http://127.0.0.1:27200/mcp
   OBSIDIAN_MCP_TOKEN=<your MCP Connector token>
   LORE_BRAIN_DIR=/absolute/path/to/your/Obsidian-vault/lore
   ```

6. Keep Obsidian open. For GitHub Copilot in VS Code, follow
   [CONNECT-YOUR-AI.md](CONNECT-YOUR-AI.md#github-copilot-vs-code-and-copilot-cli).
   Ask it to call `get_server_info` to confirm the connection.
7. When Karpathy LLM Wiki has a working model provider, run **Karpathy LLM Wiki:
   Ingest from folder** on your `lore/` folder. Obsidian's built-in Graph View
   then visualizes the generated `[[wiki-links]]`.

## Privacy and safety

- The MCP server is bound to `127.0.0.1`: it is reachable only on your laptop.
- Do not commit `.env`, an MCP token, or a token-bearing `.vscode/mcp.json`.
- Each laptop should create its own MCP Connector token.
