# Lore demo runbook

## What is live now

- Web control centre: `http://127.0.0.1:3100`
- Slack Channels runtime: listening on port `3000`
- Obsidian MCP Connector: listening on port `27200` with 16 available tools
- Local Lore brain: `Claims Platform`, `Billing`, and `Auth Service`

The browser dashboard and the brain API are live. The Teams import path has
also been exercised against the configured model: it created three cited
memories in `Claims Platform` (a decision, an owner, and an open question).

## Before recording

Keep these processes open; they are already running in this workspace. If one
stops, start it again from the repository root in a separate terminal:

```bash
npm run dev:web
npm run dev:slack
```

Keep Obsidian open, with the MCP Connector plugin enabled. Confirm the web app
is responsive before recording:

```bash
curl -fsS -o /dev/null -w 'Web: HTTP %{http_code}\n' http://127.0.0.1:3100/
curl -fsS -o /dev/null -w 'Brain: HTTP %{http_code}\n' http://127.0.0.1:3100/api/brain
```

In Slack, invite the existing app once in the demo channel:

```text
/invite @lore
```

Do not claim that Teams is a live bot integration. Lore imports a downloaded
Teams transcript through the web UI, then stores the extracted knowledge in the
same cited project brain as Slack capture.

## Two-minute recording script

### 0:00–0:15 — the problem

Show Slack and say:

> Teams make decisions in threads and calls, then lose them across projects.
> Lore is a local-first chief of staff: it turns work into cited Markdown that
> remains useful in Obsidian and across every connected surface.

### 0:15–0:45 — capture a real Slack thread

In `#claims-team`, post these three messages in one thread:

```text
Daniel: For Claims Platform, we are choosing asynchronous validation before manual review.
Priya: I own the Claims Platform migration and will publish the cutover plan Friday.
Sam: Open question: should historical claims be replayed after launch?
```

Then mention Lore in that thread:

```text
@lore Capture the durable decision, owner, and open question for Claims Platform. Cite this thread in a Lore card.
```

Say:

> Lore has the conversation context. It extracts only durable knowledge,
> preserves the speaker and thread receipt, and replies in Slack with a native
> card rather than pretending that an answer alone is memory.

Wait for the card before moving on. If the bot is not in the channel, run
`/invite @lore` and repeat the mention.

### 0:45–1:05 — prove the memory is real and project-scoped

Open `http://127.0.0.1:3100/brain`. Refresh once. Select **Claims Platform**
and point to the decision, Priya owner, open question, and citation chips.
Then select **Billing** to show a separate project brain.

Say:

> This is not a chat transcript in a database. Each project is a readable,
> cited Markdown brain in the local Obsidian vault. The project boundary is
> visible, and every fact retains its source.

### 1:05–1:30 — bring in a Teams call

Open `http://127.0.0.1:3100/onboarding`. Brief Lore once if the form is empty,
then use **Sync a Teams meeting** to upload a downloaded `.txt` or `.md`
transcript to **Claims Platform**.

Use this short transcript if you need a clean demo file:

```text
Teams meeting — Claims Platform
Daniel: We will use asynchronous validation before manual review for the claims flow.
Priya: I own the Claims Platform migration and will publish the cutover plan on Friday.
Sam: Open question: should we replay historical claims after launch?
```

After the success message, return to `/brain` and refresh to show the new cited
entries. Say:

> Teams is imported from a downloaded transcript today; it enters the exact
> same source-agnostic brain pipeline as Slack. A live Teams adapter is the next
> integration, not a claim we make in this demo.

### 1:30–2:00 — retrieval and close

Open `http://127.0.0.1:3100`, ask:

```text
What did we decide about the Claims Platform flow, who owns the migration, and what remains open?
```

Then open the same `Claims Platform` note in Obsidian and say:

> Lore captures in Slack and from Teams calls, writes a local cited memory, and
> lets the Karpathy LLM Wiki retrieve it through Obsidian. The team can inspect,
> edit, version, and own the knowledge—without a black-box memory store.

## Honest fallback

If the web chat cannot answer from the wiki during the recording, do not
improvise a result. Show `/brain` and the matching Obsidian Markdown note,
which are the verified capture/read path. The Obsidian MCP handshake is live;
the Karpathy plugin still needs its own provider test to succeed before relying
on wiki-generated answers.
