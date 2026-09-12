/**
 * Source-agnostic ingestion for Lore.
 *
 * The brain (`brain.ts`) is fed one cited entry at a time. This module turns a
 * blob of raw conversation — a Slack export, a Teams meeting transcript, a
 * pasted thread — into those entries, in two deliberately separable steps:
 *
 *   1. An `Extractor` reads raw text and proposes durable knowledge (decisions,
 *      owners, open questions). The default one asks an OpenAI model; a test can
 *      pass a fake that returns fixed entries with no network and no key.
 *   2. `ingestContent` folds each proposed entry into the brain with a citation
 *      back to the source, reusing `captureEntry` so there is exactly one writer.
 *
 * Keeping extraction behind an interface is what makes Lore source-agnostic: the
 * brain never learns where an entry came from, and swapping the model — or
 * mocking it out in a test — never touches the store.
 */
import { z } from "zod";
import {
  captureEntry,
  type CaptureResult,
  type LoreKind,
  type LoreSource,
} from "./brain";

/** One unit of durable knowledge an extractor proposes from raw text. */
export interface ExtractedEntry {
  kind: LoreKind;
  summary: string;
  /** Who owns the resulting work, if the text names one. */
  owner?: string;
  /** The unresolved question, for kind "open_question". */
  openQuestion?: string;
  /** Who said it in the source, if the text attributes it. */
  sourceAuthor?: string;
  /** A pointer to the exact spot in the source (a speaker turn, a short quote). */
  sourceRef?: string;
}

/**
 * Turn raw content into proposed entries. A pure boundary: no filesystem, no
 * knowledge of the brain. The default asks a model; tests pass a fake.
 */
export type Extractor = (
  content: string,
  ctx: { project?: string },
) => Promise<ExtractedEntry[]>;

/** Validates one model-proposed entry. Optional fields tolerate `null` so a
 * stray null never sinks an otherwise-good item; we coerce it away below. */
const extractedEntrySchema = z.object({
  kind: z.enum(["decision", "context", "open_question", "owner", "status"]),
  summary: z.string(),
  owner: z.string().nullish(),
  openQuestion: z.string().nullish(),
  sourceAuthor: z.string().nullish(),
  sourceRef: z.string().nullish(),
});

const EXTRACTION_INSTRUCTIONS = [
  "You extract durable, reusable project knowledge from a raw team conversation or meeting transcript.",
  "Capture only what is worth remembering weeks later: decisions that were made, who owns a piece of work, and questions left open.",
  "Ignore greetings, small talk, and anything superseded later in the same text.",
  "",
  "Return ONLY a JSON array — no prose, no explanation, no markdown code fences. Each element is an object:",
  '  "kind": one of "decision" | "context" | "open_question" | "owner" | "status"',
  '  "summary": one plain, self-contained sentence (required)',
  '  "owner": the person who owns the work, ONLY if the text names one (optional)',
  '  "openQuestion": the unresolved question itself, for kind "open_question" (optional)',
  '  "sourceAuthor": who said it, if the transcript attributes it (optional)',
  '  "sourceRef": a short pointer back to the source — a speaker turn or brief quote (optional)',
  "",
  'Use "owner" when the point is an assignment, "decision" for a settled choice, "open_question" for an',
  'unresolved question, "status" for progress, and "context" for durable background otherwise.',
  "If the text contains nothing durable, return []. Never invent an owner, a decision, or a source the text does not support.",
].join("\n");

/** Strip a surrounding ```json … ``` (or bare ```) fence, if the model added one. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

/**
 * Parse the model's text into entries, defensively: strip fences, JSON.parse,
 * accept either a bare array or an `{ entries: [...] }` wrapper, then validate
 * each item and drop the invalid ones rather than failing the whole batch.
 */
function parseEntries(text: string): ExtractedEntry[] {
  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFences(text));
  } catch (error) {
    throw new Error(
      `OpenAI did not return valid JSON to extract entries from: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const wrapper = raw as { entries?: unknown };
  const array = Array.isArray(raw)
    ? raw
    : Array.isArray(wrapper?.entries)
      ? wrapper.entries
      : null;
  if (!array) {
    throw new Error("OpenAI extraction did not return a JSON array of entries.");
  }

  const entries: ExtractedEntry[] = [];
  for (const item of array) {
    const parsed = extractedEntrySchema.safeParse(item);
    if (!parsed.success) continue; // drop invalid items, keep the good ones
    const summary = parsed.data.summary.trim();
    if (!summary) continue; // a hollow summary is not knowledge
    entries.push({
      kind: parsed.data.kind,
      summary,
      owner: parsed.data.owner ?? undefined,
      openQuestion: parsed.data.openQuestion ?? undefined,
      sourceAuthor: parsed.data.sourceAuthor ?? undefined,
      sourceRef: parsed.data.sourceRef ?? undefined,
    });
  }
  return entries;
}

/**
 * The default extractor: ask a chat model to lift durable knowledge out of raw
 * text, over the OpenAI-compatible `/chat/completions` API. This works against
 * OpenAI itself and against any compatible endpoint (a self-hosted GPU box, LM
 * Studio, …) via OPENAI_BASE_URL. LIVE path — needs OPENAI_API_KEY + MODEL — so
 * it is exercised by the CLI against a real key, never in the offline suite
 * (which passes its own fake instead).
 */
export const openAiExtractor: Extractor = async (content, ctx) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.MODEL;
  if (!apiKey || apiKey === "stub-replace-me") {
    throw new Error(
      "openAiExtractor needs OPENAI_API_KEY. Add it to the root `.env`, or pass a custom `extractor` to ingestContent.",
    );
  }
  if (!model) {
    throw new Error(
      "openAiExtractor needs MODEL. Add it to the root `.env`.",
    );
  }

  const baseUrl = (
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/+$/, "");

  const userContent = [
    ctx.project
      ? `This conversation concerns the project "${ctx.project}".\n\n`
      : "",
    "--- BEGIN SOURCE ---\n",
    content,
    "\n--- END SOURCE ---",
  ].join("");

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: EXTRACTION_INSTRUCTIONS },
      { role: "user", content: userContent },
    ],
    temperature: 0,
    max_tokens: 2048,
  };
  // vLLM/SGLang Qwen3: skip the thinking phase so we get JSON, not reasoning.
  if (process.env.MODEL_DISABLE_THINKING === "true") {
    body.chat_template_kwargs = { enable_thinking: false };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Extraction request could not be sent: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Extraction failed: HTTP ${response.status}${
        detail ? ` — ${detail.slice(0, 500)}` : ""
      }`,
    );
  }

  const result = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = (result.choices?.[0]?.message?.content ?? "").trim();
  if (!text) {
    throw new Error("The model returned no content to extract entries from.");
  }
  return parseEntries(text);
};

/**
 * Fold a whole blob of raw content into a project brain: run the extractor
 * (default `openAiExtractor`), then `captureEntry` for each proposed item,
 * layering per-entry `sourceAuthor`/`sourceRef` over the base `source`. Captures
 * run sequentially because the first write creates the project file's header.
 * Returns one CaptureResult per entry actually written.
 */
export async function ingestContent(opts: {
  project: string;
  source: LoreSource;
  content: string;
  extractor?: Extractor;
  dir?: string;
}): Promise<CaptureResult[]> {
  if (!opts.content.trim()) {
    throw new Error("ingestContent was given no content to extract from.");
  }

  const extractor = opts.extractor ?? openAiExtractor;
  const extracted = await extractor(opts.content, { project: opts.project });

  const results: CaptureResult[] = [];
  for (const item of extracted) {
    results.push(
      await captureEntry({
        project: opts.project,
        kind: item.kind,
        summary: item.summary,
        owner: item.owner,
        openQuestion: item.openQuestion,
        // Per-entry citation wins; fall back to the base source otherwise.
        source: {
          platform: opts.source.platform,
          ref: item.sourceRef ?? opts.source.ref,
          author: item.sourceAuthor ?? opts.source.author,
        },
        dir: opts.dir,
      }),
    );
  }
  return results;
}
