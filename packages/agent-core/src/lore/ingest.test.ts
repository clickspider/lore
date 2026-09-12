/**
 * Ingestion, tested offline. The extractor boundary exists precisely so this can
 * run with no model, no network, and no credentials: we pass a fake extractor
 * with fixed output and assert its entries land in the brain, cited. The live
 * `openAiExtractor` is exercised by the CLI against a real key, never here.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ingestContent, type Extractor } from "./ingest";
import { projectPath } from "./brain";

let dir: string;
let priorBrainDir: string | undefined;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "lore-ingest-"));
  priorBrainDir = process.env.LORE_BRAIN_DIR;
  process.env.LORE_BRAIN_DIR = dir;
});
afterEach(async () => {
  if (priorBrainDir === undefined) delete process.env.LORE_BRAIN_DIR;
  else process.env.LORE_BRAIN_DIR = priorBrainDir;
  await rm(dir, { recursive: true, force: true });
});

/** A stand-in for the model: it receives the raw content + project context and
 * returns two fixed entries — one carrying its own ref, one that must fall back
 * to the base source ref. */
const fakeExtractor: Extractor = async (content, ctx) => {
  assert.match(content, /rollback/); // the raw content really reached the extractor
  assert.equal(ctx.project, "Auth Service"); // project context was passed through
  return [
    {
      kind: "decision",
      summary: "Roll forward instead of rolling back the auth deploy.",
      sourceAuthor: "priya",
      sourceRef: "turn-4",
    },
    {
      kind: "owner",
      summary: "Dana owns the session-store migration.",
      owner: "Dana",
      sourceAuthor: "sam",
    },
  ];
};

describe("ingestContent", () => {
  it("captures every extracted entry into the one project brain, cited", async () => {
    const results = await ingestContent({
      project: "Auth Service",
      source: { platform: "teams-transcript", ref: "standup.md" },
      content: "priya: the rollback did not help, let's roll forward instead.",
      extractor: fakeExtractor,
    });

    assert.equal(results.length, 2);

    // Both entries land in the single project file, resolved from LORE_BRAIN_DIR.
    const file = projectPath("Auth Service");
    assert.equal(results[0]?.path, file);
    assert.equal(results[1]?.path, file);

    const contents = await readFile(file, "utf8");
    // Both summaries survive to disk.
    assert.match(contents, /Roll forward instead of rolling back the auth deploy\./);
    assert.match(contents, /Dana owns the session-store migration\./);
    // The owner assignment becomes a [[wikilink]] entity.
    assert.match(contents, /\*\*Owner:\*\* \[\[Dana\]\]/);

    // Every entry keeps its receipt: platform is the base source's platform.
    assert.match(contents, /platform=teams-transcript/);
    // Per-entry author wins on both entries.
    assert.match(contents, /author=\[\[priya\]\]/);
    assert.match(contents, /author=\[\[sam\]\]/);
    // Entry 1 carried its own ref; entry 2 had none, so it falls back to base.
    assert.match(contents, /ref=turn-4/);
    assert.match(contents, /ref=standup\.md/);
  });

  it("writes nothing and returns [] when the extractor finds nothing durable", async () => {
    const results = await ingestContent({
      project: "Auth Service",
      source: { platform: "teams-transcript" },
      content: "priya: morning all, nothing to report today.",
      extractor: async () => [],
    });
    assert.deepEqual(results, []);
  });

  it("refuses empty content rather than calling the extractor", async () => {
    let called = false;
    await assert.rejects(
      () =>
        ingestContent({
          project: "Auth Service",
          source: { platform: "teams-transcript" },
          content: "   \n  ",
          extractor: async () => {
            called = true;
            return [];
          },
        }),
      /no content/,
    );
    assert.equal(called, false);
  });
});
