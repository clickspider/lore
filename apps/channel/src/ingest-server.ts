/**
 * `lore:ingest-server` — a tiny HTTP front door for ingestion.
 *
 *   POST /ingest  { "project": string, "source"?: { platform?, ref?, author? }, "content": string }
 *     → 200 { "captured": CaptureResult[] }
 *
 * It exists so a local automation — a Teams webhook relay, a cron job, a shell
 * `curl` — can feed the same brain the CLI and chat tools feed, over HTTP
 * instead of a function call. It runs the LIVE OpenAI extractor, so the npm
 * script loads the root `.env` (OPENAI_API_KEY and MODEL must be set there).
 *
 * SECURITY: this binds to 127.0.0.1 only and has NO authentication — it trusts
 * every caller on the loopback interface. Do not bind it to 0.0.0.0 or expose it
 * on a public port without adding auth: extraction spends model tokens and
 * writes to disk.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { ingestContent } from "agent-core/lore";

const HOST = "127.0.0.1";
const PORT = Number(process.env.INGEST_PORT ?? 3141);
const MAX_BODY_BYTES = 1_000_000; // a transcript, not an upload service

const requestSchema = z.object({
  project: z.string().min(1),
  content: z.string().min(1),
  source: z
    .object({
      platform: z.string().min(1).optional(),
      ref: z.string().optional(),
      author: z.string().optional(),
    })
    .optional(),
});

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** Buffer the request body, refusing anything past the size cap. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const urlPath = (req.url ?? "").split("?")[0];
  if (req.method !== "POST" || urlPath !== "/ingest") {
    // Non-POST is a method problem; a POST to another path is a missing route.
    sendJson(res, req.method === "POST" ? 404 : 405, {
      error: "Only POST /ingest is supported.",
    });
    return;
  }

  if (!(req.headers["content-type"] ?? "").includes("application/json")) {
    sendJson(res, 415, { error: "Content-Type must be application/json." });
    return;
  }

  let raw: string;
  try {
    raw = await readBody(req);
  } catch (error) {
    sendJson(res, 413, {
      error: error instanceof Error ? error.message : "Could not read request body.",
    });
    return;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "Request body is not valid JSON." });
    return;
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    sendJson(res, 400, {
      error: "Invalid request. Expected { project: string, content: string, source?: { platform?, ref?, author? } }.",
      issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  try {
    const captured = await ingestContent({
      project: parsed.data.project,
      content: parsed.data.content,
      source: {
        platform: parsed.data.source?.platform ?? "http-ingest",
        ref: parsed.data.source?.ref,
        author: parsed.data.source?.author,
      },
    });
    sendJson(res, 200, { captured });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ✓ Lore ingest server on http://${HOST}:${PORT}  (loopback only, no auth)`);
  console.log('    POST /ingest  { "project": "...", "content": "...", "source"?: { "platform"?, "ref"?, "author"? } }\n');
});
