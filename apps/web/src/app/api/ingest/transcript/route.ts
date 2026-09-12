import { NextResponse } from "next/server";
import { ingestContent } from "agent-core/lore";

export const runtime = "nodejs";

const MAX_TRANSCRIPT_BYTES = 1_000_000;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Submit a transcript file as form data." }, { status: 400 });
  }
  const project = form.get("project");
  const transcript = form.get("transcript");
  if (typeof project !== "string" || !project.trim() || !(transcript instanceof File)) {
    return NextResponse.json({ error: "Choose a project and a transcript file." }, { status: 400 });
  }
  if (!/\.(md|txt)$/i.test(transcript.name) || transcript.size === 0 || transcript.size > MAX_TRANSCRIPT_BYTES) {
    return NextResponse.json({ error: "Upload a non-empty .md or .txt transcript smaller than 1 MB." }, { status: 400 });
  }
  try {
    const captured = await ingestContent({
      project: project.trim(),
      content: await transcript.text(),
      source: { platform: "teams-transcript", ref: transcript.name },
    });
    return NextResponse.json({ captured });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Could not import transcript." }, { status: 500 });
  }
}
