"use client";

import { FormEvent, useState } from "react";

export default function OnboardingPage() {
  const [saved, setSaved] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
  };

  return <main className="lore-onboarding"><header className="lore-console-header"><a className="lore-wordmark" href="/" aria-label="Lore dashboard"><img src="/lore-logo.jpeg" alt="" /> lore</a><nav><a href="/">Brain</a><a className="is-current" href="/onboarding">Brief Lore</a></nav></header><section><p className="lore-onboarding-kicker">Set up your local assistant</p><h1>Brief your new assistant.</h1><p className="lore-onboarding-intro">Give Lore the working context it needs before it turns your team&apos;s conversations into durable memory.</p><form onSubmit={submit}><label>Your role<input name="role" placeholder="e.g. Engineering lead" required /></label><label>Your projects<textarea name="projects" placeholder={"One project per line, e.g.\nClaims Platform\nNN Stack"} required /></label><label>What should Lore remember?<textarea name="duties" placeholder="Decisions, owners, risks, open questions, launch dates…" required /></label><label className="lore-dropzone">Existing chats and technical docs<input type="file" multiple /><span>Drop files here, or choose files</span><small>Transcript and document ingestion connects in the next setup step.</small></label><button type="submit">Save briefing</button>{saved ? <p className="lore-form-saved">Briefing ready for the next setup step.</p> : null}</form></section></main>;
}
