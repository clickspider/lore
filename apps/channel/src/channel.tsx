import { createChannel } from "@copilotkit/channels";
import { makeAgent, isObsidianConfigured, OBSIDIAN_CONTEXT } from "agent-core";
import { ChannelRunAgent } from "./agent";
import { required } from "./env";
import { LoreCard, welcomeMessage } from "./components";
import { readThread, captureToBrain } from "./tools";
import { LORE_SYSTEM_PROMPT } from "./prompt";

// Lore uses only the model provider and Channels — no web search and no cloud
// workplace. The brain is local-first, so nothing is registered that would send
// project knowledge off this machine. Lore captures; retrieval is delegated to
// the Karpathy LLM Wiki over the Obsidian MCP (registered on the agent when
// OBSIDIAN_MCP_URL is configured), so we never rebuild graph retrieval here.
const tools = [readThread, captureToBrain];

export const channel = createChannel({
  // Must equal the Channel Code in Intelligence, character for character. A
  // mismatch leaves the Channel at "Waiting for runtime" and is validated at
  // startup, not here.
  name: required("CHANNEL_CODE"),

  // Required. "platform" derives the canonical user from provider + workspace +
  // platform user id. Do NOT move this onto CopilotRuntime — that one is for
  // web requests and must be absent on a Channels-only runtime.
  identifyUser: "platform",

  // Lore's own prompt and no cloud workplace MCP. This leaves the shared
  // web/mobile agent factory untouched — the domain swap lives here.
  agent: (threadId) =>
    new ChannelRunAgent(
      (innerThreadId) =>
        makeAgent(innerThreadId, {
          prompt: LORE_SYSTEM_PROMPT,
          workplace: false,
        }),
      threadId,
    ),

  tools,
  components: [LoreCard],

  // Injected into the agent's prompt on every run.
  context: [
    {
      description: "Rendering",
      value:
        "You can draw a native card by calling lore_card. Prefer it over prose when presenting captured knowledge or an answer with sources.",
    },
    {
      description: "Surface",
      value:
        "This is a chat thread in a channel people are actively working in. The conversation here is the raw material you capture from; assume others are reading.",
    },
    {
      description: "Memory",
      value:
        "The brain is a per-project markdown store on this machine. Your job here is to capture what will matter next week — decisions, owners, open questions — each with a citation. Retrieval and cross-project questions are answered by the Karpathy LLM Wiki over the Obsidian MCP when it is connected, not by re-reading the raw notes yourself.",
    },
    ...(isObsidianConfigured()
      ? [{ description: "Retrieval", value: OBSIDIAN_CONTEXT }]
      : []),
  ],
});

// A mention subscribes the conversation, so Lore then follows along instead of
// needing to be @-mentioned every single turn.
channel.onMention(async ({ thread }) => {
  await thread.subscribe();
  await thread.runAgent();
});

// Non-mentioned turns only ever reach onMessage — gate them on the flag or the
// agent will answer every message in every channel it has been invited to.
channel.onMessage(async ({ thread }) => {
  if (await thread.isSubscribed()) {
    await thread.runAgent();
  }
});

channel.onWelcome(async ({ thread, platform }) => {
  await thread.post(welcomeMessage(platform));
});
