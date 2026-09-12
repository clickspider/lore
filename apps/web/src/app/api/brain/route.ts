import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { brainDir, listProjects, readProject } from "agent-core/lore";
import { NextResponse } from "next/server";
import type {
  BrainData,
  DashEntry,
  DashLedgerItem,
  DashProject,
  DashSource,
  LoreEntryKind,
} from "@/lib/lore-dash";

export const runtime = "nodejs";

const run = promisify(execFile);
const entryPattern = /^## (\d{4}-\d{2}-\d{2}) · (decision|context|open_question|owner|status)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm;
const sourcePattern = /^- \*\*Source:\*\* (.+)$/m;
const ownerPattern = /^- \*\*Owner:\*\* \[\[(.+?)\]\]$/m;
const questionPattern = /^- \*\*Open question:\*\* (.+)$/m;
const sourcePartPattern = /(platform|author|ref)=([^·\n]+)/g;

function parseSource(block: string): DashSource {
  const source = sourcePattern.exec(block)?.[1] ?? "platform=unknown";
  const parsed: DashSource = { platform: "unknown" };

  for (const match of source.matchAll(sourcePartPattern)) {
    const value = match[2].trim().replace(/^\[\[(.+)\]\]$/, "$1");
    if (match[1] === "platform") parsed.platform = value;
    if (match[1] === "author") parsed.author = value;
    if (match[1] === "ref") parsed.ref = value;
  }

  return parsed;
}

function parseEntries(markdown: string): DashEntry[] {
  const entries: DashEntry[] = [];

  for (const match of markdown.matchAll(entryPattern)) {
    const [, date, kind, block] = match;
    const summary = block
      .split("\n")
      .find((line) => line.trim() && !line.startsWith("- "))
      ?.trim();

    if (!summary) continue;
    entries.push({
      date,
      kind: kind as LoreEntryKind,
      summary,
      owner: ownerPattern.exec(block)?.[1],
      openQuestion: questionPattern.exec(block)?.[1],
      source: parseSource(block),
    });
  }

  return entries.toReversed();
}

async function readLedger(directory: string): Promise<DashLedgerItem[]> {
  try {
    const { stdout } = await run("git", [
      "-C",
      directory,
      "log",
      "-n",
      "8",
      "--format=%h%x1f%cI%x1f%s",
    ]);
    return stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        const [hash, date, subject] = line.split("\u001f");
        return hash && date && subject ? [{ hash, date, subject }] : [];
      });
  } catch {
    return [];
  }
}

export async function GET() {
  const directory = brainDir();
  const summaries = await listProjects(directory);
  const projects = await Promise.all(
    summaries.map(async ({ slug, title }): Promise<DashProject> => {
      const project = await readProject(slug, directory);
      return { slug, title, entries: parseEntries(project.markdown) };
    }),
  );
  const captures = projects.reduce((total, project) => total + project.entries.length, 0);
  const sources = new Set(
    projects.flatMap((project) =>
      project.entries.map((entry) => `${entry.source.platform}:${entry.source.author ?? ""}`),
    ),
  );

  const payload: BrainData = {
    generatedAt: new Date().toISOString(),
    brainDir: directory,
    stats: { projects: projects.length, captures, sources: sources.size },
    projects,
    ledger: await readLedger(directory),
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
