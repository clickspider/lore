/**
 * Shared contract for the Lore dashboard: the `/api/brain` route produces this,
 * the dashboard page consumes it. One source of truth so the data agent and the
 * UI agent cannot drift.
 */
export type LoreEntryKind =
  | "decision"
  | "context"
  | "open_question"
  | "owner"
  | "status";

export interface DashSource {
  platform: string; // e.g. "slack", "teams-transcript"
  author?: string; // wikilink text stripped, e.g. "Daniel Frey"
  ref?: string; // message ts / line / quote
}

export interface DashEntry {
  kind: LoreEntryKind;
  summary: string;
  owner?: string;
  openQuestion?: string;
  date: string; // YYYY-MM-DD
  source: DashSource;
}

export interface DashProject {
  slug: string;
  title: string;
  entries: DashEntry[]; // newest first
}

export interface DashLedgerItem {
  hash: string; // short git hash
  date: string; // ISO
  subject: string; // commit subject
}

export interface BrainData {
  generatedAt: string; // ISO
  brainDir: string;
  stats: {
    projects: number;
    captures: number;
    sources: number; // distinct authors/platforms cited
  };
  projects: DashProject[];
  ledger: DashLedgerItem[]; // newest first, may be [] if the vault is not a git repo
}

export const BRAIN_API_PATH = "/api/brain";
