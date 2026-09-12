"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopilotChat, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import type { BrainData, DashEntry, DashProject, LoreEntryKind } from "@/lib/lore-dash";
import { BRAIN_API_PATH } from "@/lib/lore-dash";

const sectionConfig: Record<LoreEntryKind, { title: string; empty: string }> = {
  decision: { title: "Decisions", empty: "No decisions captured yet." },
  owner: { title: "Owners", empty: "No owners captured yet." },
  open_question: { title: "Open questions", empty: "No open questions captured yet." },
  status: { title: "Status", empty: "No status updates captured yet." },
  context: { title: "Context", empty: "No context captured yet." },
};

function citation(entry: DashEntry) {
  const source = entry.source.platform.replace("-transcript", "");
  return `${source}${entry.source.ref ? ` · ${entry.source.ref}` : ""}`;
}

function BrainSection({ entries, kind }: { entries: DashEntry[]; kind: LoreEntryKind }) {
  const config = sectionConfig[kind];
  const matching = entries.filter((entry) => entry.kind === kind);
  return <section className="lore-brain-section"><h3>{config.title}<small>{matching.length}</small></h3>{matching.length ? matching.map((entry, index) => <article className="lore-brain-entry" key={`${entry.summary}-${index}`}><p>{entry.summary}</p>{entry.owner ? <strong>Owner · {entry.owner}</strong> : null}<span className="lore-citation">{citation(entry)}</span></article>) : <p className="lore-empty-copy">{config.empty}</p>}</section>;
}

function ActivityItem({ entry }: { entry: DashEntry }) {
  const label = entry.kind === "decision" ? "Brain updated" : entry.kind === "owner" ? "Owner recorded" : entry.kind === "open_question" ? "Open question captured" : "Knowledge captured";
  return <article className={`lore-activity-item lore-activity-item--${entry.kind}`}><span aria-hidden="true" /><div><strong>{label}</strong><p>{entry.summary}</p><time>{citation(entry)}</time></div></article>;
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
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const selectedProject = useMemo<DashProject | undefined>(() => brain?.projects.find((project) => project.slug === selectedSlug) ?? brain?.projects[0], [brain?.projects, selectedSlug]);
  const activity = useMemo(() => (brain?.projects.flatMap((project) => project.entries) ?? []).slice(0, 5), [brain]);

  useConfigureSuggestions({ suggestions: [{ title: "Open questions", message: "What remains unresolved in the knowledge graph? Cite the source notes." }, { title: "Cross-project decisions", message: "What decisions connect the current projects? Cite the source notes." }], available: "before-first-message" }, []);

  return <main className="lore-console">
    <header className="lore-console-header"><a className="lore-wordmark" href="/" aria-label="Lore dashboard"><img src="/lore-logo.jpeg" alt="" /> lore</a><nav><a className="is-current" href="/">Brain</a><a href="/onboarding">Brief Lore</a></nav><div className="lore-console-status"><i /> {loading ? "Syncing" : "Vault connected"}</div></header>
    {error ? <div className="lore-console-error">{error} <button onClick={() => void refresh()}>Retry</button></div> : null}
    <div className="lore-console-grid">
      <aside className="lore-sidebar"><div className="lore-panel-title"><span>Projects</span><button onClick={() => void refresh()}>{loading ? "Syncing" : "Refresh"}</button></div><nav className="lore-project-list">{brain?.projects.map((project) => <button className={project.slug === selectedProject?.slug ? "is-active" : ""} key={project.slug} onClick={() => setSelectedSlug(project.slug)}><i /><span><strong>{project.title}</strong><small>{project.entries.length} memories</small></span><b>{project.entries.length}</b></button>)}</nav><div className="lore-source-list"><div className="lore-panel-title"><span>Sources</span></div><div><i /><span><strong>Slack threads</strong><small>Capture on mention</small></span></div><div><i /><span><strong>Teams transcripts</strong><small>Import-ready</small></span></div><div><i /><span><strong>Obsidian + Karpathy</strong><small>Local graph</small></span></div></div><p className="lore-vault-path">{brain?.brainDir ?? "Connecting to vault…"}</p></aside>
      <section className="lore-brain" aria-live="polite">{selectedProject ? <><header className="lore-brain-header"><div><p>Project brain</p><h1>{selectedProject.title}</h1></div><span><i /> {loading ? "Syncing" : "Synced just now"}</span></header><p className="lore-brain-intro">Cited memory maintained from the conversations and documents your team already has.</p><BrainSection entries={selectedProject.entries} kind="decision" /><BrainSection entries={selectedProject.entries} kind="owner" /><BrainSection entries={selectedProject.entries} kind="open_question" /><BrainSection entries={selectedProject.entries} kind="status" /></> : <div className="lore-no-project"><h1>Your brain is ready.</h1><p>Capture a Slack thread to create the first project memory.</p></div>}</section>
      <aside className="lore-activity"><div className="lore-panel-title"><span>Live activity</span><small>Latest captures</small></div>{activity.length ? activity.map((entry, index) => <ActivityItem entry={entry} key={`${entry.summary}-${index}`} />) : <p className="lore-empty-copy">Activity appears after the first capture.</p>}</aside>
      <section className="lore-ask" aria-labelledby="ask-the-brain"><header><div><p>Ask the brain</p><h2 id="ask-the-brain">Query across your knowledge graph</h2></div><span>Karpathy MCP</span></header><CopilotChat className="lore-chat" labels={{ welcomeMessageText: "Ask Lore about your project memory.", chatInputPlaceholder: "What did we decide about the claims flow?" }} /></section>
    </div>
  </main>;
}
