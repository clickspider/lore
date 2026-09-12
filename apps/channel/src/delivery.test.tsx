import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AbstractAgent } from "@ag-ui/client";
import { EventType, type BaseEvent, type RunAgentInput } from "@ag-ui/core";
import { from, type Observable } from "rxjs";
import { createChannel } from "@copilotkit/channels";
import { startChannelsWithGatewayControl } from "@copilotkit/channels-intelligence";
import { readProject } from "agent-core/lore";
import { LoreCard } from "./components";
import { captureToBrain } from "./tools";
import { ManagedGateway, preparedDelivery } from "./testing/managed-gateway";

/**
 * Real AG-UI events exercise the SDK tool loop and Slack renderer together: the
 * agent first calls `capture_to_brain` (a real tool that writes a file and posts
 * a receipt), then renders a `lore_card` (an agent-rendered component). A final
 * run with no tool call ends the loop.
 */
class LoreAgent extends AbstractAgent {
  private iteration = 0;
  override clone(): LoreAgent {
    const clone = new LoreAgent();
    clone.threadId = this.threadId;
    clone.setMessages([...this.messages]);
    clone.setState(this.state);
    clone.iteration = this.iteration;
    return clone;
  }
  run(input: RunAgentInput): Observable<BaseEvent> {
    const calls = [
      {
        name: "capture_to_brain",
        args: {
          project: "Auth Service",
          kind: "decision",
          summary: "Switch auth from JWT to server-side sessions.",
          owner: "Dana",
          sourceRef: "1699.0001",
          sourceAuthor: "priya",
        },
      },
      {
        name: "lore_card",
        args: {
          project: "Auth Service",
          title: "Sessions replace JWT",
          body: "The team switched auth to server-side sessions.",
          sources: [{ who: "priya", ref: "1699.0001" }],
        },
      },
    ];
    const call = calls[this.iteration++];
    const events: BaseEvent[] = [
      {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      },
    ];
    if (call) {
      const toolCallId = `tool_${this.iteration}`;
      events.push(
        {
          type: EventType.TOOL_CALL_START,
          toolCallId,
          toolCallName: call.name,
        },
        {
          type: EventType.TOOL_CALL_ARGS,
          toolCallId,
          delta: JSON.stringify(call.args),
        },
        { type: EventType.TOOL_CALL_END, toolCallId },
      );
    }
    events.push({
      type: EventType.RUN_FINISHED,
      threadId: input.threadId,
      runId: input.runId,
    });
    return from(events);
  }
}

async function runLore() {
  const gateway = new ManagedGateway();
  const channel = createChannel({
    name: "support",
    identifyUser: "platform",
    showToolStatus: true,
    agent: () => new LoreAgent(),
    components: [LoreCard],
    tools: [captureToBrain],
  });
  let failure: unknown;
  channel.onMessage(async ({ thread }) => {
    try {
      await thread.runAgent();
    } catch (error) {
      failure = error;
      throw error;
    }
  });
  let agentMessages: AbstractAgent["messages"] = [];
  const handle = await startChannelsWithGatewayControl([channel], {
    session: gateway,
    scope: { projectId: 1, channelName: "support" },
    runtimeInstanceId: "rti_lore",
    loadHistory: async () => [],
    appApiBaseUrl: "https://api.example",
    apiKey: "cpk-offline-test",
    appApiFetch: async (input) => {
      if (String(input).endsWith("/charge"))
        return Response.json({ charged: true });
      assert.ok(
        String(input).endsWith("/transcript"),
        `Unexpected request: ${input}`,
      );
      return Response.json({
        messages: [],
        truncation: {
          messageLimit: false,
          byteLimit: false,
          omittedMessageCount: 0,
        },
      });
    },
    runCanonical: async (args) => {
      const result = await args.execute(
        {},
        { threadId: args.threadId, runId: args.runId },
      );
      agentMessages = args.agent.messages;
      return result;
    },
  });
  try {
    await gateway.deliver(
      preparedDelivery("lore", "slack", {
        kind: "text",
        text: "Capture this thread and summarise what we decided",
      }),
    );
    return {
      gateway,
      payloads: gateway.packets.map(({ payload }) => payload),
      failure,
      agentMessages,
    };
  } finally {
    await handle.stop();
  }
}

describe("managed lore delivery", () => {
  it(
    "runs the tool loop over managed delivery: writes the brain and lowers a lore_card into Slack",
    { timeout: 10_000 },
    async () => {
      const previous = process.env.LORE_BRAIN_DIR;
      const dir = await mkdtemp(path.join(os.tmpdir(), "lore-delivery-"));
      process.env.LORE_BRAIN_DIR = dir;
      try {
        const { gateway, payloads, failure, agentMessages } = await runLore();
        assert.equal(failure, undefined);

        const cards = payloads.filter(
          (payload) => payload.kind === "slack.message.create",
        );
        // Two native cards: the receipt the capture tool posts, then the
        // agent-rendered lore_card. Both are real JSX lowered to Block Kit.
        assert.equal(
          cards.length,
          2,
          JSON.stringify({ payloads, agentMessages }),
        );
        assert.match(JSON.stringify(cards[0]), /Captured to Lore/);
        // The lore_card lowered into the Slack IR — project and title present.
        assert.match(JSON.stringify(cards[1]), /Auth Service/);
        assert.match(JSON.stringify(cards[1]), /Sessions replace JWT/);

        // The tool loop did a real write: the brain now holds the cited decision.
        const read = await readProject("Auth Service");
        assert.equal(read.exists, true, "capture must leave a file on disk");
        assert.match(
          read.markdown,
          /Switch auth from JWT to server-side sessions\./,
        );

        // The capture confirmation fed back to the model through the tool loop,
        // naming the file slug — proof the loop closed, not just fired.
        assert.ok(
          agentMessages.some(
            (message) =>
              message.role === "tool" &&
              String(message.content).includes("auth-service"),
          ),
          "the capture tool result must return to the model",
        );

        // Managed delivery completed cleanly, and the native working indicator
        // was exercised and then cleared.
        const statuses = payloads.filter(
          (payload) => payload.kind === "slack.thread.status",
        );
        assert.ok(
          statuses.some((payload) => payload.status !== ""),
          "must exercise the native working indicator",
        );
        assert.equal(
          statuses.at(-1)?.status,
          "",
          "the working indicator must clear before completion",
        );
        const terminal = payloads.at(-1);
        assert.ok(terminal?.kind === "channel.delivery.terminal");
        assert.equal(terminal.status, "complete");
        assert.deepEqual(
          gateway.packets.map((packet) => packet.seq),
          payloads.map((_, index) => index),
        );
      } finally {
        if (previous === undefined) delete process.env.LORE_BRAIN_DIR;
        else process.env.LORE_BRAIN_DIR = previous;
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
});
