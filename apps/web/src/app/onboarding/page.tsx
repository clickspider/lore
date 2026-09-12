"use client";

import { FormEvent, useState } from "react";

type Status = { tone: "success" | "error"; message: string } | undefined;

export default function OnboardingPage() {
  const [briefStatus, setBriefStatus] = useState<Status>();
  const [importStatus, setImportStatus] = useState<Status>();
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function saveBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setBriefStatus(undefined);
    const fields = new FormData(event.currentTarget);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: fields.get("role"),
        projects: String(fields.get("projects") ?? "").split("\n").filter(Boolean),
        duties: fields.get("duties"),
      }),
    });
    const result = await response.json() as { error?: string };
    setSaving(false);
    setBriefStatus(response.ok ? { tone: "success", message: "Brief saved. New Lore chats now receive this context." } : { tone: "error", message: result.error ?? "Could not save the brief." });
  }

  async function importTranscript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImporting(true);
    setImportStatus(undefined);
    const response = await fetch("/api/ingest/transcript", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json() as { captured?: unknown[]; error?: string };
    setImporting(false);
    setImportStatus(response.ok ? { tone: "success", message: `${result.captured?.length ?? 0} durable memories added to the project brain.` } : { tone: "error", message: result.error ?? "Could not import the transcript." });
  }

  return <main className="lore-onboarding"><header className="lore-console-header"><a className="lore-wordmark" href="/" aria-label="Lore dashboard"><img src="/lore-logo.jpeg" alt="" /> lore</a><nav><a href="/">Chat</a><a href="/brain">Brain</a><a className="is-current" href="/onboarding">Brief Lore</a></nav></header><section><p className="lore-onboarding-kicker">Set up your local assistant</p><h1>Brief your new assistant.</h1><p className="lore-onboarding-intro">This is not a marketing form: Lore saves this brief locally and adds it to every new web-chat session. The project brain remains the cited evidence layer.</p><div className="lore-setup-steps"><span>01 Brief Lore</span><i /><span>02 Import a transcript</span><i /><span>03 Ask with receipts</span></div><form onSubmit={saveBrief}><label>Your role<input name="role" placeholder="e.g. Engineering lead" required /></label><label>Your projects<textarea name="projects" placeholder={"One project per line, e.g.\nClaims Platform\nNN Stack"} required /></label><label>What should Lore remember?<textarea name="duties" placeholder="Decisions, owners, risks, open questions, launch dates…" required /></label><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save briefing"}</button>{briefStatus ? <p className={`lore-form-status is-${briefStatus.tone}`}>{briefStatus.message}</p> : null}</form><section className="lore-transcript-import"><div><p className="lore-onboarding-kicker">Transcript import</p><h2>Sync a Teams meeting.</h2><p>Upload a downloaded Teams transcript. Lore extracts durable project memory into local Markdown; it does not claim a live Teams connection.</p></div><form onSubmit={importTranscript}><label>Destination project<input name="project" placeholder="e.g. Claims Platform" required /></label><label className="lore-dropzone">Teams transcript (.md or .txt, up to 1 MB)<input name="transcript" type="file" accept=".md,.txt,text/plain,text/markdown" required /><span>Choose a downloaded transcript</span><small>The import runs locally against Lore&apos;s existing source-agnostic ingestion path.</small></label><button type="submit" disabled={importing}>{importing ? "Importing…" : "Import transcript"}</button>{importStatus ? <p className={`lore-form-status is-${importStatus.tone}`}>{importStatus.message}</p> : null}</form></section></section></main>;
}
