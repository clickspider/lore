/**
 * Component tests.
 *
 * `renderToIR` lowers a Channels JSX tree to the platform-neutral IR the
 * adapter is actually handed — `{ type, props }` nodes — so these run with no
 * Slack app, no Intelligence project and no credentials of any kind.
 *
 * That matters for a hackathon kit: change a card, know in a second whether you
 * broke it. Node's built-in runner means there is nothing to install either.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToIR } from "@copilotkit/channels";
import { LoreCard, welcomeMessage } from "./components";

const ctx = { platform: "slack" as const, signal: new AbortController().signal };

/** The rendered IR as a searchable string. */
async function render(node: unknown): Promise<string> {
  return JSON.stringify(renderToIR((await node) as never));
}

const baseAnswer = {
  project: "Auth Service",
  title: "Sessions replace JWT",
  body: "The team switched auth to server-side sessions.",
  sources: [] as { who?: string; ref: string }[],
};

describe("lore_card", () => {
  it("carries the project, title, and body — the three things a reader needs to trust the answer", async () => {
    const out = await render(LoreCard.render(baseAnswer, ctx));
    assert.ok(out.includes("Auth Service"), "the project must ground the card");
    assert.ok(out.includes("Sessions replace JWT"), "the title must headline it");
    assert.ok(
      out.includes("The team switched auth to server-side sessions."),
      "the body is the answer itself",
    );
  });

  it("renders the sources section, with attribution, when the brain has citations to show", async () => {
    const out = await render(
      LoreCard.render(
        {
          ...baseAnswer,
          sources: [
            { who: "priya", ref: "1699.0001" },
            { ref: "1699.0002" },
          ],
        },
        ctx,
      ),
    );
    assert.ok(out.includes("Sources"), "a citations section must appear");
    assert.ok(out.includes("priya"), "a named speaker is attributed");
    assert.ok(out.includes("1699.0001"));
    // A source without a named speaker still lists its pointer.
    assert.ok(out.includes("1699.0002"));
  });

  it("omits the sources section entirely when there is nothing to cite", async () => {
    // An empty *Sources* heading would imply citations the brain does not have.
    const out = await render(LoreCard.render(baseAnswer, ctx));
    assert.ok(!out.includes("Sources"), "no citations should mean no heading");
  });
});

describe("welcomeMessage", () => {
  it("says what Lore does and names the platform it was invited into", async () => {
    const out = await render(welcomeMessage("Slack"));
    assert.ok(out.includes("Lore"), "an invited bot that says nothing looks broken");
    assert.ok(out.includes("Slack"), "the greeting is tailored to the surface");
  });
});
