"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopilotChat, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import type { BrainData, DashEntry, DashProject, LoreEntryKind } from "@/lib/lore-dash";
import { BRAIN_API_PATH } from "@/lib/lore-dash";

const kindLabels: Record<LoreEntryKind, string> = {
  decision: "Decision",
  context: "Context",
  open_question: "Open question",
  owner: "Owner",
  status: "Status",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function relativeTime(value: string) {
  const days = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 86_400_000));
  return days === 0 ? "Today" : `${days}d ago`;
}

function TimelineEntry({ entry }: { entry: DashEntry }) {
  return (
    <article className="lore-entry">
      <div className="lore-entry-rail" aria-hidden="true"><span /></div>
      <div className="lore-entry-main">
        <div className="lore-entry-meta">
          <span className={`lore-kind lore-kind--${entry.kind}`}>{kindLabels[entry.kind]}</span>
          <time>{formatDate(entry.date)}</time>
        </div>
        <p>{entry.summary}</p>
        <div className="lore-entry-receipt">
          <span>↳ {entry.source.platform}</span>
          {entry.source.author ? <span>{entry.source.author}</span> : null}
          {entry.source.ref ? <code>{entry.source.ref}</code> : null}
        </div>
        {entry.owner ? <span className="lore-owner">Owner · {entry.owner}</span> : null}
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="lore-empty">
      <span>✦</span>
      <h2>Your brain is ready for its first memory.</h2>
      <p>In Slack, mention Lore in a thread and ask it to capture the durable decisions.</p>
    </div>
  );
}

export function LoreDashboard() {
  const [brain, setBrain] = useState<BrainData>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(BRAIN_API_PATH, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not read your brain (${response.status}).`);
      const nextBrain = (await response.json()) as BrainData;
      setBrain(nextBrain);
      setSelectedSlug((current) => current ?? nextBrain.projects[0]?.slug);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read your brain.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedProject = useMemo<DashProject | undefined>(
    () => brain?.projects.find((project) => project.slug === selectedSlug) ?? brain?.projects[0],
    [brain?.projects, selectedSlug],
  );

  useConfigureSuggestions(
    {
      suggestions: [
        { title: "Ask across the graph", message: "What decisions connect Billing and Auth Service? Cite the vault sources." },
        { title: "Find open questions", message: "What remains unresolved in the knowledge graph?" },
      ],
      available: "before-first-message",
    },
    [],
  );

  return (
    <main className="lore-shell">
      <header className="lore-topbar">
        <a className="lore-brand" href="#top" aria-label="Lore home"><i>✦</i><span>lore</span></a>
        <div className="lore-live"><span /> Local brain online</div>
        <button className="lore-refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Syncing…" : "↻ Refresh"}
        </button>
      </header>

      <section className="lore-hero" id="top">
        <div>
          <p className="lore-kicker">Control center</p>
          <h1>Context, without<br /><em>the archaeology.</em></h1>
          <p className="lore-hero-copy">A living, cited memory of the work your team already did.</p>
        </div>
        <div className="lore-hero-note">
          <span>LIVE VAULT</span>
          <strong>{brain?.brainDir.split("/").slice(-2).join("/") ?? "Connecting…"}</strong>
          <p>Written by Lore. Read by Obsidian and any MCP-connected assistant.</p>
        </div>
      </section>

      {error ? <div className="lore-error">{error} <button onClick={() => void refresh()}>Try again</button></div> : null}

      <section className="lore-stats" aria-label="Brain statistics">
        <div><b>{brain?.stats.projects ?? "—"}</b><span>Projects remembered</span></div>
        <div><b>{brain?.stats.captures ?? "—"}</b><span>Cited captures</span></div>
        <div><b>{brain?.stats.sources ?? "—"}</b><span>Conversation sources</span></div>
        <div><b>Git</b><span>Reversible by design</span></div>
      </section>

      <section className="lore-grid">
        <aside className="lore-projects" aria-label="Projects">
          <div className="lore-section-heading"><span>Projects</span><small>{brain?.projects.length ?? 0}</small></div>
          <nav>
            {brain?.projects.map((project) => (
              <button
                className={project.slug === selectedProject?.slug ? "is-selected" : ""}
                key={project.slug}
                onClick={() => setSelectedSlug(project.slug)}
              >
                <span className="lore-project-mark">{project.title.slice(0, 1)}</span>
                <span><strong>{project.title}</strong><small>{project.entries.length} memories</small></span>
                <b>›</b>
              </button>
            ))}
          </nav>
          <div className="lore-ledger">
            <div className="lore-section-heading"><span>Change ledger</span><small>Git</small></div>
            {brain?.ledger.length ? brain.ledger.slice(0, 3).map((item) => (
              <div className="lore-ledger-item" key={item.hash}>
                <code>{item.hash}</code><p>{item.subject}</p><time>{relativeTime(item.date)}</time>
              </div>
            )) : <p className="lore-ledger-empty">Initialize Git in the vault to see every reversible change here.</p>}
          </div>
        </aside>

        <section className="lore-timeline" aria-live="polite">
          {selectedProject ? <>
            <header className="lore-timeline-head">
              <div><p className="lore-kicker">Project memory</p><h2>{selectedProject.title}</h2></div>
              <span>{selectedProject.entries.length} entries</span>
            </header>
            <div className="lore-timeline-list">
              {selectedProject.entries.map((entry, index) => <TimelineEntry entry={entry} key={`${entry.source.ref ?? entry.summary}-${index}`} />)}
            </div>
          </> : <EmptyState />}
        </section>

        <section className="lore-assistant" aria-labelledby="lore-assistant-title">
          <header><div><p className="lore-kicker">Ask Lore</p><h2 id="lore-assistant-title">Query the graph</h2></div><span>Karpathy + MCP</span></header>
          <p className="lore-assistant-intro">Ask for connections across projects. Lore delegates retrieval to your local Obsidian knowledge graph.</p>
          <CopilotChat
            className="lore-chat"
            labels={{ welcomeMessageText: "What would you like to understand?", chatInputPlaceholder: "Ask across your project memory…" }}
          />
        </section>
      </section>
    </main>
  );
}
