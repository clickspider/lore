import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { isCodexModel, resolveModel } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { workplaceMcpServers } from "./capabilities/workplace";
import { obsidianMcpServers } from "./capabilities/obsidian";

/**
 * The agent factory.
 *
 * Return a FRESH agent per threadId — never share one stateful instance across
 * conversations. Channels clones the agent per turn anyway, but a factory is the
 * documented shape and keeps per-thread state honest.
 *
 * To swap in LangGraph, CrewAI, Mastra, Pydantic AI, or Google ADK, replace the
 * body with an HttpAgent pointed at your agent's AG-UI endpoint:
 *
 *   import { HttpAgent } from "@ag-ui/client";
 *   return new HttpAgent({ url: process.env.AGENT_URL! });
 *
 * Nothing else in the kit changes. That is the point of AG-UI.
 */
export type AgentFactoryOptions = {
  /** Disable workplace MCP for surfaces that should only see local app tools. */
  workplace?: boolean;
  /** Override the default incident prompt for a surface-specific starter. */
  prompt?: string;
};

export function makeAgent(threadId: string, options: AgentFactoryOptions = {}) {
  const agent = new BuiltInAgent({
    model: resolveModel(),
    prompt: options.prompt ?? SYSTEM_PROMPT,

    // NOT optional in practice. maxSteps defaults to 1, which means the agent
    // can call one tool and then stops — before it ever sees the result. Any
    // agent with tools needs room to loop.
    maxSteps: 10,

    // MCP servers, each added only when configured, so the agent is never handed
    // tools that would fail. The workplace (Ambiguous) is opt-out per surface; the
    // Obsidian wiki (Lore's retrieval) is always included when connected. HTTP
    // transport takes `options` (with a wrapped `options.fetch` for auth), not
    // `headers`.
    mcpServers: [
      ...(options.workplace === false ? [] : workplaceMcpServers()),
      ...obsidianMcpServers(),
    ],

    // The ChatGPT/Codex endpoint explicitly requires store:false. Supplying it
    // here (rather than only mutating the outgoing HTTP body) lets the AI SDK
    // serialize full stateless history instead of invalid item references.
    providerOptions: isCodexModel() ? { openai: { store: false } } : undefined,
  });
  agent.threadId = threadId;
  return agent;
}
