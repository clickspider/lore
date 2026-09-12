import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const envFile = path.join(repoRoot, ".env");

try {
  process.loadEnvFile(envFile);
} catch {
  throw new Error(`Could not load ${envFile}. Run the Lore setup first.`);
}

const url = process.env.OBSIDIAN_MCP_URL?.trim();
const token = process.env.OBSIDIAN_MCP_TOKEN?.trim();
if (!url || !token) {
  throw new Error(
    "Set OBSIDIAN_MCP_URL and OBSIDIAN_MCP_TOKEN in .env before installing Lore for Copilot.",
  );
}

const destination = path.join(homedir(), ".copilot", "mcp-config.json");
let config = {};
try {
  config = JSON.parse(await readFile(destination, "utf8"));
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw new Error(`Could not parse ${destination}: ${error.message}`);
  }
}

const existingServers = config.mcpServers;
if (existingServers !== undefined && (typeof existingServers !== "object" || Array.isArray(existingServers))) {
  throw new Error(`${destination} has an invalid mcpServers value.`);
}

config.mcpServers = {
  ...existingServers,
  lore: {
    type: "http",
    url,
    headers: { Authorization: `Bearer ${token}` },
    tools: [
      "get_server_info",
      "list_vault_files",
      "get_vault_file",
      "list_tags",
      "get_note_property",
      "search_vault",
      "search_vault_simple",
    ],
  },
};

await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
await chmod(destination, 0o600);

console.log("Lore is installed for GitHub Copilot in ~/.copilot/mcp-config.json.");
console.log("Restart Copilot Chat or run `copilot mcp list`, then ask it to search your Lore brain.");
