import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ingestContent } from "agent-core/lore";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = [
  { project: "AI Claims", file: "ai-claims-product-review.md" },
  { project: "Claims Migration", file: "claims-migration-cutover.md" },
];

for (const fixture of fixtures) {
  const content = await readFile(
    path.join(root, "demo-fixtures", "teams", fixture.file),
    "utf8",
  );
  const captured = await ingestContent({
    project: fixture.project,
    content,
    source: { platform: "teams-transcript", ref: fixture.file },
  });
  console.log(`${fixture.project}: ${captured.length} cited memories`);
}
