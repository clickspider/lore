import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readProject } from "agent-core/lore";
import { captureToBrain, readThread } from "./tools";

/** Only the methods these tools call; the rest of Thread is irrelevant here. */
const stubContext = (thread: Record<string, unknown>) =>
  ({
    thread,
    user: { id: "u1", name: "priya" },
    actor: { id: "a1" },
    platform: "slack",
  }) as never;

describe("read_thread", () => {
  it("returns the messages when the surface exposes history", async () => {
    const messages = [
      { id: "1", role: "user", content: "we decided to drop JWT" },
    ];
    const result = await readThread.handler(
      {},
      stubContext({ getMessages: mock.fn(async () => messages) }),
    );
    assert.deepEqual(result, messages);
  });

  it("degrades into an instruction, not an empty array, when history is unavailable", async () => {
    // getMessages() is capability-gated: it returns [] rather than throwing on
    // surfaces that cannot read history. Handing that [] straight to the model
    // reads as "the thread is empty", and the agent then captures or answers
    // confidently about a conversation it never actually saw.
    const result = await readThread.handler(
      {},
      stubContext({ getMessages: mock.fn(async () => []) }),
    );
    assert.equal(typeof result, "string");
    assert.match(String(result), /cannot see earlier messages/i);
  });
});

describe("capture_to_brain", () => {
  let dir: string;
  let previous: string | undefined;

  beforeEach(async () => {
    // A fresh brain per test, selected through the same env var the tool reads,
    // so the write path is exercised end to end with no repo pollution.
    dir = await mkdtemp(path.join(os.tmpdir(), "lore-capture-"));
    previous = process.env.LORE_BRAIN_DIR;
    process.env.LORE_BRAIN_DIR = dir;
  });
  afterEach(async () => {
    if (previous === undefined) delete process.env.LORE_BRAIN_DIR;
    else process.env.LORE_BRAIN_DIR = previous;
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a cited entry to disk, posts one receipt card, and names the file back to the agent", async () => {
    const post = mock.fn(async () => ({ id: "posted" }));
    const result = await captureToBrain.handler(
      {
        project: "Auth Service",
        kind: "decision",
        summary: "Switch auth from JWT to server-side sessions.",
        owner: "Dana",
        sourceRef: "1699.0001",
        sourceAuthor: "priya",
      },
      stubContext({ post }),
    );

    // The file is the product: capture must leave a real, cited markdown entry.
    const read = await readProject("Auth Service");
    assert.equal(read.exists, true, "the project brain must exist on disk");
    assert.match(
      read.markdown,
      /Switch auth from JWT to server-side sessions\./,
    );
    // The receipt survives to disk: the source author is cited, not invented.
    assert.match(read.markdown, /author=\[\[priya\]\]/);

    // The receipt card is posted exactly once — a deterministic proof of the write,
    // not something the model might paraphrase or skip.
    assert.equal(post.mock.callCount(), 1);

    // What the agent reads back is a confirmation that names the file (its slug),
    // so a later answer can cite where the knowledge lives.
    assert.equal(typeof result, "string");
    assert.match(String(result), /auth-service/);
  });
});
