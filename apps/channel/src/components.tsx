/**
 * Lore's native cards.
 *
 * Two shapes:
 *  - `captureCard` is a plain JSX factory the capture tool posts itself, so the
 *    card is a deterministic receipt of a real file write — not something the
 *    model might paraphrase.
 *  - `LoreCard` is an agent-rendered component (`defineChannelComponent` = a tool
 *    the agent can call) for presenting an answer with its citations.
 *
 * One tree renders as Slack Block Kit, Teams Adaptive Cards, and Discord
 * components. A surface that cannot render a node skips it rather than failing.
 */
import {
  defineChannelComponent,
  Message,
  Header,
  Section,
  Markdown,
  Fields,
  Field,
  Context,
  Divider,
  Actions,
  Button,
} from "@copilotkit/channels";
import type { CaptureResult } from "agent-core/lore";
import path from "node:path";
import { z } from "zod";

/** Green rail — this card marks knowledge that is now on disk. */
const CAPTURED_ACCENT = "#2E7D5B";
/** Blue-grey rail — a read-back answer, grounded in the brain. */
const ANSWER_ACCENT = "#3B6EA5";

function shortPath(absolute: string): string {
  const marker = `${path.sep}brain${path.sep}`;
  const at = absolute.indexOf(marker);
  return at >= 0 ? absolute.slice(at + 1) : absolute;
}

function citation(source: CaptureResult["entry"]["source"]): string {
  return [
    source.platform,
    source.author ? `from ${source.author}` : undefined,
    source.ref ? `(${source.ref})` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The receipt for a real capture: what Lore folded into the brain, cited, and
 * the file it now lives in. Posted by the capture tool, not the model.
 */
export function captureCard(result: CaptureResult) {
  const { entry } = result;
  return (
    <Message accent={CAPTURED_ACCENT}>
      <Header>Captured to Lore</Header>
      <Context>{`${result.project} · ${entry.kind.replace("_", " ")}`}</Context>
      <Section>
        <Markdown>{entry.summary}</Markdown>
      </Section>
      <Fields>
        {entry.owner && <Field label="Owner">{entry.owner}</Field>}
        {entry.openQuestion && (
          <Field label="Open question">{entry.openQuestion}</Field>
        )}
        <Field label="Source">{citation(entry.source)}</Field>
      </Fields>
      <Divider />
      <Context>
        {`Written to ${shortPath(result.path)} — plain markdown on this machine.`}
      </Context>
    </Message>
  );
}

/**
 * An agent-rendered answer, grounded in the brain. The agent fills `body` from
 * what query_brain returned and lists the sources it quoted.
 */
export const LoreCard = defineChannelComponent({
  name: "lore_card",
  description:
    "Present project knowledge or an answer as a card: a short body grounded in the brain, and the sources it came from. Call this instead of writing a paragraph when you are answering from query_brain or summarising what you captured. Only list sources the brain actually contains — never invent one.",
  parameters: z.object({
    project: z.string().describe("The project this is about."),
    title: z.string().describe("A short headline for the answer, under ten words."),
    body: z
      .string()
      .describe("The answer, grounded strictly in the brain. Markdown allowed."),
    sources: z
      .array(
        z.object({
          who: z.string().optional().describe("Who said it, if the brain records it."),
          ref: z.string().describe("The cited pointer, e.g. a message ts or line."),
        }),
      )
      .max(6)
      .default([])
      .describe("Citations quoted from the brain. Empty if none apply."),
  }),
  render({ project, title, body, sources }) {
    return (
      <Message accent={ANSWER_ACCENT}>
        <Header>{title}</Header>
        <Context>{project}</Context>
        <Section>
          <Markdown>{body}</Markdown>
        </Section>
        {sources.length > 0 && (
          <Section>
            <Markdown>
              {`*Sources*\n${sources
                .map((s) => `• ${s.who ? `${s.who} — ` : ""}${s.ref}`)
                .join("\n")}`}
            </Markdown>
          </Section>
        )}
      </Message>
    );
  },
});

/**
 * The welcome message. A bot that says nothing when invited looks broken; one
 * that says what it will do gets used.
 */
export function welcomeMessage(platform: string) {
  return (
    <Message accent={CAPTURED_ACCENT}>
      <Header>Lore — your projects' memory, in the thread</Header>
      <Section>
        <Markdown>
          {"@-mention me in a " +
            platform +
            " thread and I read what was said, fold the decisions, owners, and open " +
            "questions into a per-project markdown brain on this machine, and cite the " +
            "source. Later, ask me *what did we decide about X* and I answer from the brain."}
        </Markdown>
      </Section>
      <Fields>
        <Field label="I will">Capture decisions, keep a cited project memory</Field>
        <Field label="I won't">Send anything off this machine</Field>
      </Fields>
      <Actions>
        <Button
          value="catchup"
          style="primary"
          onClick={async ({ thread }) => {
            await thread.runAgent({
              prompt:
                "Read this thread and capture any decisions, owners, or open questions into the right project's brain. Then show a lore_card summary of what you captured.",
            });
          }}
        >
          Capture this thread
        </Button>
      </Actions>
    </Message>
  );
}
