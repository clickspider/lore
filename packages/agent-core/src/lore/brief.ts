import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { brainDir } from "./brain";

export interface AssistantBrief {
  role: string;
  projects: string[];
  duties: string;
  updatedAt: string;
}

function briefPath(dir?: string): string {
  return path.join(brainDir(dir), ".lore", "assistant-brief.json");
}

export async function saveAssistantBrief(input: Omit<AssistantBrief, "updatedAt">): Promise<AssistantBrief> {
  const brief: AssistantBrief = {
    role: input.role.trim(),
    projects: input.projects.map((project) => project.trim()).filter(Boolean),
    duties: input.duties.trim(),
    updatedAt: new Date().toISOString(),
  };
  const file = briefPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  return brief;
}

export async function readAssistantBrief(): Promise<AssistantBrief | undefined> {
  try {
    const raw = await readFile(briefPath(), "utf8");
    const brief = JSON.parse(raw) as AssistantBrief;
    if (!brief.role || !brief.duties || !Array.isArray(brief.projects)) return undefined;
    return brief;
  } catch {
    return undefined;
  }
}
