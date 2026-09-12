/**
 * Retrieval, delegated.
 *
 * Lore captures; it does not answer. The Karpathy LLM Wiki — running inside the
 * user's own Obsidian, reached over the istefox "MCP Connector" — owns retrieval,
 * the entity/concept graph, and cross-project Q&A. We hand the agent that MCP
 * server so it can query the wiki and trigger ingest, and we build no graph
 * retrieval of our own.
 *
 * This is local-first: the MCP server lives on `127.0.0.1` inside Obsidian, so
 * nothing leaves the machine. Without OBSIDIAN_MCP_URL this contributes nothing —
 * the agent is simply never told it has a wiki, rather than being handed a tool
 * that fails.
 */
import type { MCPClientConfig } from "@copilotkit/runtime/v2";

export function isObsidianConfigured(): boolean {
  return Boolean(process.env.OBSIDIAN_MCP_URL);
}

/**
 * Spreadable so an unconfigured wiki adds no entry at all. Same HTTP MCP shape as
 * the workplace server: `options.fetch` carries the bearer token (the `http`
 * transport has no `headers` field). The token is optional because a local MCP
 * Connector can be run without access control.
 */
export function obsidianMcpServers(): MCPClientConfig[] {
  const url = process.env.OBSIDIAN_MCP_URL;
  if (!url) return [];

  const token = process.env.OBSIDIAN_MCP_TOKEN;
  return [
    {
      type: "http",
      url,
      options: {
        // The MCP Connector's streamable-HTTP endpoint rejects a request (406)
        // unless the client accepts BOTH json and the SSE stream, so force the
        // Accept header, and carry the bearer token when access control is on.
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("Accept", "application/json, text/event-stream");
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      },
    },
  ];
}

/** Told to the agent as context, so it knows retrieval belongs to the wiki. */
export const OBSIDIAN_CONTEXT =
  "Your project brain is also a Karpathy LLM Wiki in the user's Obsidian vault, reachable over this MCP server. Use it to answer questions about what a project already contains and for cross-project questions — read the wiki and its graph, and trigger an ingest after you capture new notes. Do NOT re-derive answers from the raw thread or invent them; retrieval is the wiki's job, capture is yours.";
