/**
 * The change ledger.
 *
 * Every capture is a knowledge change, and in a regulated shop a knowledge change
 * has to be auditable and reversible. The deterministic answer already exists:
 * the brain is a folder of markdown, so we let git be the ledger — each capture is
 * a commit whose message carries what changed and why. History is `git log`; undo
 * is `git revert`. No bespoke ledger engine, no chance of the model rewriting the
 * record.
 *
 * This is best-effort: if the vault is not a git repo it silently does nothing, so
 * a capture never fails because of the ledger. To turn the ledger on, `git init`
 * the vault once.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);

export interface LedgerResult {
  committed: boolean;
  /** Present when we did not commit — e.g. "not a git repo", "nothing to commit". */
  reason?: string;
  /** The short commit hash, when we committed. */
  commit?: string;
}

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    const { stdout } = await run("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

/**
 * Commit the current state of the brain with a message describing the change.
 * `file` is committed specifically when given, else the whole vault is staged.
 * Author identity comes from the vault's own git config, so the ledger reflects
 * the operator, not this process.
 */
export async function recordChange(
  brainDir: string,
  message: string,
  file?: string,
): Promise<LedgerResult> {
  if (!(await isGitRepo(brainDir))) {
    return { committed: false, reason: "brain is not a git repo (run `git init` in the vault to enable the ledger)" };
  }
  try {
    const target = file ? path.relative(brainDir, file) || "." : "-A";
    await run("git", ["-C", brainDir, "add", target]);
    // Nothing staged → nothing to record, and that is fine.
    const { stdout: status } = await run("git", ["-C", brainDir, "status", "--porcelain"]);
    if (status.trim() === "") {
      return { committed: false, reason: "nothing to commit" };
    }
    await run("git", ["-C", brainDir, "commit", "-m", message, "--no-verify"]);
    const { stdout: hash } = await run("git", ["-C", brainDir, "rev-parse", "--short", "HEAD"]);
    return { committed: true, commit: hash.trim() };
  } catch (error) {
    // The ledger must never break a capture; report and move on.
    return {
      committed: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
