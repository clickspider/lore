/**
 * `lore:ingest` — fold a saved transcript into a project brain from the shell.
 *
 *   npm run lore:ingest "<Project Name>" <path/to/transcript>
 *
 * This is the batch counterpart to the in-thread capture tool: the same brain
 * and the same citations, but the source is a file on disk (a Teams meeting
 * transcript) and extraction runs once over the whole thing via the default
 * OpenAI extractor. It is a LIVE path — the npm script loads the root `.env`
 * with --env-file, so OPENAI_API_KEY and MODEL must be set there.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ingestContent } from "agent-core/lore";

async function main(): Promise<void> {
  const [project, file] = process.argv.slice(2);
  if (!project || !file) {
    throw new Error(
      [
        'Usage: npm run lore:ingest "<Project Name>" <transcript-file>',
        "",
        "  Example:",
        '    npm run lore:ingest "Auth Service" assets/samples/teams-standup-2026-09-12.md',
      ].join("\n"),
    );
  }

  const content = await readFile(file, "utf8").catch(() => {
    throw new Error(`Could not read transcript file: ${file}`);
  });

  const ref = path.basename(file);
  const results = await ingestContent({
    project,
    source: { platform: "teams-transcript", ref },
    content,
  });

  if (results.length === 0) {
    console.log(
      `\n  No durable knowledge found in ${ref}; nothing was written to the brain for "${project}".\n`,
    );
    return;
  }

  const files = [...new Set(results.map((r) => r.path))];
  const noun = results.length === 1 ? "entry" : "entries";
  console.log(`\n  ✓ Folded ${results.length} ${noun} from ${ref} into "${project}".`);
  for (const f of files) console.log(`    Project brain: ${f}`);
  console.log("");
  for (const r of results) {
    const owner = r.entry.owner ? ` · owner ${r.entry.owner}` : "";
    console.log(`    - [${r.entry.kind}] ${r.entry.summary}${owner}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error(`\n  ✗ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
