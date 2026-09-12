/**
 * Lore's tools for the chat surface.
 *
 * The loop is: read the conversation (read_thread) → fold what matters into the
 * per-project markdown brain (capture_to_brain) → answer later strictly from the
 * brain (query_brain). Capture performs a real file write and posts a receipt
 * card; query never writes.
 *
 * A tool's return value is what the *agent* reads back, not what the user sees.
 * Return raw data (it is JSON-stringified for you) or a short natural-language
 * confirmation — never `{ ok: true }`, and never hand-stringify.
 */
import { defineChannelTool } from "@copilotkit/channels";
import { captureEntry, type LoreKind } from "agent-core/lore";
import path from "node:path";
import { z } from "zod";
import { captureCard } from "./components";
import { recordChange } from "./ledger";

const KIND = z.enum([
  "decision",
  "context",
  "open_question",
  "owner",
  "status",
]);

/**
 * Read the conversation already present — the raw material Lore captures from.
 */
export const readThread = defineChannelTool({
  name: "read_thread",
  description:
    "Read the recent messages in this conversation. Call this FIRST on any request — the thread is what you capture from and answer about. Do not ask anyone to re-explain what the thread already says.",
  parameters: z.object({}),
  async handler(_args, { thread }) {
    const messages = await thread.getMessages();
    if (messages.length === 0) {
      return "This surface does not expose conversation history, or the thread is empty. Say you cannot see earlier messages and ask for the shortest possible summary; do not capture anything you cannot cite.";
    }
    return messages;
  },
});

/**
 * Fold one unit of project knowledge into the brain. This WRITES a real markdown
 * file on this machine and posts a receipt card. Call once per distinct item.
 */
export const captureToBrain = defineChannelTool({
  name: "capture_to_brain",
  description:
    "Save one decision, owner assignment, or open question into a project's living markdown brain, with a citation back to the source message. Call once per distinct item. This writes a real file on this machine and posts a receipt. Never invent an owner or a source the thread does not support.",
  parameters: z.object({
    project: z
      .string()
      .min(1)
      .describe("The project this belongs to, e.g. 'Auth Service'."),
    kind: KIND.describe(
      "What kind of knowledge this is: decision, context, open_question, owner, or status.",
    ),
    summary: z
      .string()
      .min(1)
      .describe("The knowledge itself, in one plain sentence."),
    owner: z
      .string()
      .optional()
      .describe("Who owns the resulting work, only if the thread names one."),
    openQuestion: z
      .string()
      .optional()
      .describe("A question the discussion left open, if any."),
    sourceRef: z
      .string()
      .optional()
      .describe(
        "A pointer to the exact source message — a timestamp or id from read_thread.",
      ),
    sourceAuthor: z
      .string()
      .optional()
      .describe("Who said it, from the thread."),
  }),
  async handler(
    { project, kind, summary, owner, openQuestion, sourceRef, sourceAuthor },
    { thread, platform },
  ) {
    let result;
    try {
      result = await captureEntry({
        project,
        kind: kind as LoreKind,
        summary,
        owner,
        openQuestion,
        source: { platform, ref: sourceRef, author: sourceAuthor },
      });
    } catch (error) {
      // The agent loop turns tool errors into model-only data; surface it so the
      // model reports the failure instead of claiming a save that never happened.
      return `Failed to write to the brain: ${
        error instanceof Error ? error.message : String(error)
      }. Do not claim anything was saved.`;
    }
    await thread.post(captureCard(result));
    // Best-effort ledger: each capture is a git commit in the vault, so the
    // change is auditable and reversible (git revert). Never fails the capture.
    const ledger = await recordChange(
      path.dirname(result.path),
      `lore: capture ${kind} — ${summary}`,
      result.path,
    );
    const ledgerNote = ledger.committed ? ` Ledgered as ${ledger.commit}.` : "";
    return `Captured a ${kind} to ${result.project} (${result.slug}.md)${
      result.createdFile ? ", creating the project brain" : ""
    }.${ledgerNote} The receipt card is posted; do not restate it in prose.`;
  },
});

// Retrieval is intentionally NOT a tool here. Lore captures; the Karpathy LLM
// Wiki (reached over the Obsidian MCP) owns retrieval, the entity graph, and
// cross-project Q&A. Keeping a local reader here would drift into rebuilding
// that — the line we do not cross.
