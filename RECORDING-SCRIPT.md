# Lore — 2 minute recording

## One-time reset and seed

Run this before recording. It preserves the existing demo brain as a dated
backup and creates a fresh one with two clearly-labelled sample projects.

```bash
cd /Users/danielfrey/conductor/workspaces/agents-everywhere-starter-kit/copenhagen
brain_dir="$(node --env-file=.env -p 'process.env.LORE_BRAIN_DIR')"
mv "$brain_dir" "${brain_dir}.before-recording-$(date +%s)"
mkdir -p "$brain_dir"
node --env-file=.env --import tsx scripts/seed-demo.ts
```

Keep these running in separate terminals if they are not already:

```bash
npm run dev:web
npm run dev:slack
```

Open three tabs: `http://127.0.0.1:3100/onboarding`,
`http://127.0.0.1:3100/brain`, and `http://127.0.0.1:3100`.

## Slack setup

Create or use these two channels; two channels are enough to make the
multi-project point clearly in two minutes:

```text
#ai-claims-model
#claims-migration-rollout
```

In each channel run `/invite @lore`. Post the matching messages below as a
thread, then send the final Lore mention in that same thread.

### `#ai-claims-model`

```text
Daniel: AI Claims will use confidence scoring to assist reviewers, never to automatically deny a claim.
Maya: I own the evaluation dashboard and the precision/recall report Thursday.
Jon: Open question: what confidence threshold requires human review?
@lore Capture the decision, owner, and open question for AI Claims. Cite this thread in a Lore card.
```

### `#claims-migration-rollout`

```text
Daniel: Claims Migration will move one insurer cohort at a time behind a feature flag, not a big-bang cutover.
Priya: I own the cohort runbook and Friday rollback drill.
Sam: Open question: do historical claim attachments move in the first cohort or a separate backfill?
@lore Capture the decision, owner, and open question for Claims Migration. Cite this thread in a Lore card.
```

## Read this aloud

### 0:00–0:15 — hook

> Meet Lore: the team memory that turns scattered Slack threads and Teams calls
> into a cited, project-specific brain you own. Instead of losing decisions in
> chat, the work becomes readable Markdown in your Obsidian vault.

### 0:15–0:30 — onboarding

Open **Brief Lore**. The form is prefilled for a product and engineering lead
working on AI Claims and Claims Migration. Click **Save briefing**.

> I give Lore my role, projects, and what I want it to remember. That context
> guides new chats, while facts still need a source in the project brain.

### 0:30–0:55 — Slack capture

Show `#ai-claims-model`, then the Lore card. Switch to
`#claims-migration-rollout`, then the second Lore card.

> Lore understands the thread it was mentioned in. It extracts only durable
> decisions, owners, and open questions, then gives me a native Slack receipt
> with the source—not a black-box summary.

### 0:55–1:20 — prove two separate brains

Open **Brain**, refresh, and switch between **AI Claims** and **Claims
Migration**. Point to each citation chip.

> Each project stays separate, but every memory is plain Markdown in my vault:
> inspectable, editable, versionable, and cited back to where it came from.

### 1:20–1:40 — Teams import

Return to **Brief Lore**, under **Sync a Teams meeting**, choose
`demo-fixtures/teams/ai-claims-risk-review.md`, select **AI Claims**, and click
**Import transcript**. Return to Brain and refresh.

> Slack is live capture. Teams is an honest downloaded-transcript import today.
> Both land in the same source-agnostic memory pipeline, so the project brain
> stays current wherever the team worked.

### 1:40–2:00 — personal assistant close

Open **Chat** and ask:

```text
Across AI Claims and Claims Migration, what did we decide, who owns the next milestone, and what risks remain? Cite the relevant project notes.
```

> Lore gives me one personal assistant across my work, but the knowledge stays
> local, project-aware, and traceable. That is the difference between chat
> history and team memory.

## Recording truth

The Teams files are clearly labelled sample exports. Slack capture is live once
the bot is invited and mentioned. Do not describe Teams as a live bot adapter.
