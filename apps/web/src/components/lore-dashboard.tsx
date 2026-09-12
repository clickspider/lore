"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopilotChat } from "@copilotkit/react-core/v2";
import { FaMicrosoft, FaSlack } from "react-icons/fa";
import { SiObsidian } from "react-icons/si";
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

const providerIcon = {
  slack: FaSlack,
  teams: FaMicrosoft,
  obsidian: SiObsidian,
};

function SourceItem({ provider, title, detail }: { provider: keyof typeof providerIcon; title: string; detail: string }) {
  const Icon = providerIcon[provider];
  return <div className="lore-source-item"><Icon aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span></div>;
}

function ChatSurface({ primary = false }: { primary?: boolean }) {
  return <section className={primary ? "lore-chat-main" : "lore-ask"} aria-labelledby="ask-the-brain"><header><div><p>Ask the brain</p><h2 id="ask-the-brain">{primary ? "Your team, fully briefed." : "Query across your knowledge graph"}</h2></div><span>Karpathy MCP</span></header><p className="lore-chat-intro">Ask Lore about decisions, owners, blockers, and the connections between projects. Every answer should lead back to source notes.</p><CopilotChat className="lore-chat" messageView={{ assistantMessage: "lore-assistant-message", userMessage: "lore-user-message" }} input={{ disclaimer: () => null }} labels={{ welcomeMessageText: "Ask Lore about your project memory.", chatInputPlaceholder: "What did we decide about the claims flow?" }} /></section>;
}

export function LoreDashboard({ view = "chat" }: { view?: "chat" | "brain" }) {
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
  const chatFirst = view === "chat";

  return <main className="lore-console">
    <header className="lore-console-header"><a className="lore-wordmark" href="/" aria-label="Lore dashboard"><img src="/lore-logo.jpeg" alt="" /> lore</a><nav><a className={chatFirst ? "is-current" : ""} href="/">Chat</a><a className={!chatFirst ? "is-current" : ""} href="/brain">Brain</a><a href="/onboarding">Brief Lore</a></nav><div className="lore-console-status"><i /> {loading ? "Syncing" : "Vault connected"}</div></header>
    {error ? <div className="lore-console-error">{error} <button onClick={() => void refresh()}>Retry</button></div> : null}
    <div className={`lore-console-grid ${chatFirst ? "is-chat-first" : "is-brain-first"}`}>
      <aside className="lore-sidebar"><div className="lore-panel-title"><span>Projects</span><button onClick={() => void refresh()}>{loading ? "Syncing" : "Refresh"}</button></div><nav className="lore-project-list">{brain?.projects.map((project) => <button className={project.slug === selectedProject?.slug ? "is-active" : ""} key={project.slug} onClick={() => setSelectedSlug(project.slug)}><i /><span><strong>{project.title}</strong><small>{project.entries.length} memories</small></span><b>{project.entries.length}</b></button>)}</nav><div className="lore-source-list"><div className="lore-panel-title"><span>Sources</span></div><SourceItem provider="slack" title="Slack threads" detail="Capture on mention" /><SourceItem provider="teams" title="Teams transcripts" detail="Import from Brief Lore" /><SourceItem provider="obsidian" title="Obsidian + Karpathy" detail="Local graph" /></div><p className="lore-vault-path">{brain?.brainDir ?? "Connecting to vault…"}</p></aside>
      {chatFirst ? <ChatSurface primary /> : <section className="lore-brain" aria-live="polite">{selectedProject ? <><header className="lore-brain-header"><div><p>Project brain</p><h1>{selectedProject.title}</h1></div><span><i /> {loading ? "Syncing" : "Synced just now"}</span></header><p className="lore-brain-intro">Cited memory maintained from the conversations and documents your team already has.</p><BrainSection entries={selectedProject.entries} kind="decision" /><BrainSection entries={selectedProject.entries} kind="owner" /><BrainSection entries={selectedProject.entries} kind="open_question" /><BrainSection entries={selectedProject.entries} kind="status" /></> : <div className="lore-no-project"><h1>Your brain is ready.</h1><p>Capture a Slack thread to create the first project memory.</p></div>}</section>}
      <aside className="lore-activity"><div className="lore-panel-title"><span>Live activity</span><small>Latest captures</small></div>{activity.length ? activity.map((entry, index) => <ActivityItem entry={entry} key={`${entry.summary}-${index}`} />) : <p className="lore-empty-copy">Activity appears after the first capture.</p>}</aside>
      {!chatFirst ? <ChatSurface /> : null}
    </div>
  </main>;
}
