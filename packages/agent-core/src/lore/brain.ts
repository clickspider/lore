/**
 * The Lore brain — a local-first, git-versioned, per-project markdown store.
 *
 * This module IS the product. Everything else in Lore is an adapter that either
 * feeds this store (a chat thread, a meeting transcript) or reads from it (a
 * chat answer, a digest, an MCP server). The store is plain markdown on disk:
 * human-readable, editable in Obsidian, diffable in git, and never a black box.
 *
 * It is deliberately surface-agnostic. It imports nothing from CopilotKit, no
 * model client, and no network — only Node's `fs`. A Slack tool, a Teams
 * transcript importer, and an MCP server all call the same three functions.
 */
import { mkdir, readFile, readdir, appendFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** The kinds of knowledge Lore folds into a project brain. */
export type LoreKind =
  | "decision"
  | "context"
  | "open_question"
  | "owner"
  | "status";

/** Where a captured entry came from, so every claim has a receipt. */
export interface LoreSource {
  /** The surface it was captured from, e.g. "slack", "teams-transcript". */
  platform: string;
  /** A stable pointer back to the exact source (message ts, line, url). */
  ref?: string;
  /** Who said it, if known. */
  author?: string;
}

/** One folded-in unit of project knowledge. */
export interface LoreEntry {
  /** ISO date (YYYY-MM-DD) the entry was captured. */
  date: string;
  kind: LoreKind;
  /** The knowledge itself, in one plain sentence. */
  summary: string;
  /** Who owns the resulting work, if the source named one. */
  owner?: string;
  /** A question the source left open. */
  openQuestion?: string;
  source: LoreSource;
}

export interface CaptureInput {
  project: string;
  kind: LoreKind;
  summary: string;
  owner?: string;
  openQuestion?: string;
  source: LoreSource;
  /** Override the brain directory (tests, or a per-user vault). */
  dir?: string;
  /** Override the capture date (tests). Defaults to today, UTC. */
  date?: string;
}

export interface CaptureResult {
  project: string;
  slug: string;
  path: string;
  entry: LoreEntry;
  /** The exact markdown block that was appended. */
  markdown: string;
  /** True when this write created the project file. */
  createdFile: boolean;
}

export interface ProjectRead {
  slug: string;
  path: string;
  exists: boolean;
  /** The full markdown, or "" when the project has no brain yet. */
  markdown: string;
}

export interface ProjectSummary {
  slug: string;
  /** The human title from the file's H1, falling back to the slug. */
  title: string;
  path: string;
}

/**
 * The default brain lives at the repository root in `brain/`, resolved relative
 * to this module so it is stable no matter which app's cwd is running. Override
 * per-process with LORE_BRAIN_DIR (an absolute path), or per-call with `dir`.
 */
export function brainDir(dir?: string): string {
  if (dir) return dir;
  if (process.env.LORE_BRAIN_DIR) return process.env.LORE_BRAIN_DIR;
  // packages/agent-core/src/lore/brain.ts → up four to the repo root.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../brain");
}

/** A filesystem-safe, stable project slug. Distinct names never collide onto
 * the same file, and the same name always resolves to the same file. */
export function slugifyProject(name: string): string {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error(
      `Project name "${name}" has no usable characters for a brain file.`,
    );
  }
  return slug;
}

export function projectPath(project: string, dir?: string): string {
  return path.join(brainDir(dir), `${slugifyProject(project)}.md`);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Prefer the frontmatter `title:`, then the first H1, then the slug. */
function titleFromMarkdown(markdown: string, slug: string): string {
  const fm = markdown.match(/^---\n([\s\S]*?)\n---/);
  const fmTitle = fm?.[1]?.match(/^title:\s*(.+)$/m)?.[1]?.trim();
  if (fmTitle) return fmTitle;
  const h1 = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return h1 ?? slug;
}

/** Turn a name into an Obsidian wikilink, so entities resolve in the graph. */
function wikilink(name: string): string {
  return `[[${name.replace(/[[\]]/g, "").trim()}]]`;
}

/**
 * Render one entry as a markdown block. Human-readable, and shaped so the
 * Karpathy LLM Wiki plugin (or `karpathywiki-cli`) can ingest it: `[[wikilinks]]`
 * for owners and speakers become entity pages, and every entry keeps its receipt.
 */
export function formatEntry(entry: LoreEntry): string {
  const lines: string[] = [`## ${entry.date} · ${entry.kind}`, entry.summary];
  if (entry.owner) lines.push(`- **Owner:** ${wikilink(entry.owner)}`);
  if (entry.openQuestion) lines.push(`- **Open question:** ${entry.openQuestion}`);
  const src = entry.source;
  const cite = [
    `platform=${src.platform}`,
    src.author ? `author=${wikilink(src.author)}` : undefined,
    src.ref ? `ref=${src.ref}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  lines.push(`- **Source:** ${cite}`);
  return `${lines.join("\n")}\n`;
}

function fileHeader(project: string, date: string): string {
  return [
    // YAML frontmatter matches the plugin's own note convention, so the vault
    // and the generated wiki stay consistent.
    "---",
    `title: ${project}`,
    "type: project",
    `created: ${date}`,
    "tags: [lore, project]",
    "---",
    "",
    `# ${project}`,
    "",
    "> Maintained by Lore from your team's actual work — chats and meeting",
    "> transcripts routed to this project. Plain markdown: edit it, diff it, open",
    "> it in Obsidian, or ingest it with the Karpathy LLM Wiki. Every entry cites",
    "> its source.",
    "",
  ].join("\n");
}

/**
 * Fold one unit of knowledge into a project brain, creating the file the first
 * time. Returns what was written and where, so the caller can show a real,
 * verifiable result (a file on disk, not an in-memory promise).
 */
export async function captureEntry(input: CaptureInput): Promise<CaptureResult> {
  const summary = input.summary.trim();
  if (!summary) throw new Error("Cannot capture an empty summary to the brain.");

  const slug = slugifyProject(input.project);
  const dir = brainDir(input.dir);
  const file = path.join(dir, `${slug}.md`);
  const entry: LoreEntry = {
    date: input.date ?? todayUtc(),
    kind: input.kind,
    summary,
    owner: input.owner?.trim() || undefined,
    openQuestion: input.openQuestion?.trim() || undefined,
    source: input.source,
  };
  const markdown = formatEntry(entry);

  await mkdir(dir, { recursive: true });
  const createdFile = !existsSync(file);
  const block = createdFile
    ? `${fileHeader(input.project, entry.date)}\n${markdown}`
    : `\n${markdown}`;
  await appendFile(file, block, "utf8");

  return { project: input.project, slug, path: file, entry, markdown, createdFile };
}

/** Read a project's whole brain. Missing project → exists:false, markdown:"". */
export async function readProject(
  project: string,
  dir?: string,
): Promise<ProjectRead> {
  const slug = slugifyProject(project);
  const file = path.join(brainDir(dir), `${slug}.md`);
  if (!existsSync(file)) {
    return { slug, path: file, exists: false, markdown: "" };
  }
  const markdown = await readFile(file, "utf8");
  return { slug, path: file, exists: true, markdown };
}

/** List every project that has a brain, newest-touched first. */
export async function listProjects(dir?: string): Promise<ProjectSummary[]> {
  const base = brainDir(dir);
  if (!existsSync(base)) return [];
  const names = await readdir(base);
  const projects: (ProjectSummary & { mtime: number })[] = [];
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const file = path.join(base, name);
    const info = await stat(file);
    if (!info.isFile()) continue;
    const slug = name.slice(0, -3);
    const title = titleFromMarkdown(await readFile(file, "utf8"), slug);
    projects.push({ slug, title, path: file, mtime: info.mtimeMs });
  }
  return projects
    .sort((a, b) => b.mtime - a.mtime)
    .map(({ slug, title, path: p }) => ({ slug, title, path: p }));
}
