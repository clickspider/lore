/** Resolve the selected chat provider. Voice uses OpenAI Realtime separately. */
import { createOpenAI } from "@ai-sdk/openai";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_MODEL } from "./model-meta";

function canonicalProvider(provider: string) {
  const normalized = provider.trim().toLowerCase();
  return normalized === "gemini" || normalized === "google-gemini" ? "google" : normalized;
}

/**
 * vLLM/SGLang serve Qwen3 with a "thinking" phase that burns the token budget
 * before any tool call. Setting MODEL_DISABLE_THINKING=true injects the
 * `chat_template_kwargs.enable_thinking=false` extra so tool-calls come out
 * immediately — the difference between a snappy demo and a hung one.
 */
const noThinkFetch: typeof fetch = async (input, init) => {
  if (typeof init?.body === "string") {
    try {
      const body = JSON.parse(init.body);
      body.chat_template_kwargs = {
        ...(body.chat_template_kwargs ?? {}),
        enable_thinking: false,
      };
      return fetch(input, { ...init, body: JSON.stringify(body) });
    } catch {
      /* not JSON — send unchanged */
    }
  }
  return fetch(input, init);
};

/**
 * Route calls through an existing Codex/ChatGPT subscription (OAuth), not a
 * paid API key. Reads the token the Codex CLI already stored; the request goes
 * to the private Codex backend over the Responses API. Frontier models with no
 * API billing — but an undocumented endpoint, a token that expires in hours (run
 * `codex login` to refresh), and outside OpenAI's API ToS. Free routes stay the
 * safer default; this is opt-in via MODEL_PROVIDER=codex.
 */
function readCodexAccess(): { accessToken: string; accountId: string } {
  const path =
    process.env.CODEX_AUTH_FILE || join(homedir(), ".codex", "auth.json");
  let raw: { tokens?: { access_token?: string; account_id?: string } };
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`Cannot read Codex auth at ${path}. Run \`codex login\`.`);
  }
  const token = raw.tokens?.access_token;
  const accountId = raw.tokens?.account_id;
  if (!token || !accountId) {
    throw new Error(`No Codex OAuth token in ${path}. Run \`codex login\` first.`);
  }
  return { accessToken: token, accountId };
}

/** The Codex backend rejects sampling params and demands `store:false`. */
const codexFetch: typeof fetch = async (input, init) => {
  if (typeof init?.body === "string") {
    try {
      const body = JSON.parse(init.body);
      delete body.temperature;
      delete body.top_p;
      delete body.max_output_tokens;
      return fetch(input, { ...init, body: JSON.stringify({ ...body, store: false }) });
    } catch {
      /* non-JSON body: leave as-is */
    }
  }
  return fetch(input, init);
};

export function resolveModel() {
  const model = (process.env.MODEL || DEFAULT_MODEL).trim();

  // A ChatGPT/Codex subscription via OAuth, over the Responses API. Checked
  // first so it wins even if a base URL is also set.
  if ((process.env.MODEL_PROVIDER || "").trim().toLowerCase() === "codex") {
    const { accessToken, accountId } = readCodexAccess();
    const codex = createOpenAI({
      baseURL: "https://chatgpt.com/backend-api/codex",
      apiKey: accessToken,
      headers: {
        "ChatGPT-Account-Id": accountId,
        originator: "codex_cli_rs",
        "User-Agent": "codex_cli_rs/0.153.4",
        session_id: randomUUID(),
      },
      fetch: codexFetch,
    });
    return codex.responses(model.replace(/^codex:/, ""));
  }

  // Any OpenAI-compatible endpoint (a self-hosted GPU box, a hackathon route,
  // LM Studio, …). OPENAI_BASE_URL routes everything through its
  // /chat/completions; MODEL is the raw model id it serves.
  const customBaseUrl = process.env.OPENAI_BASE_URL?.trim();
  if (customBaseUrl) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when OPENAI_BASE_URL is set.");
    }
    const provider = createOpenAI({
      baseURL: customBaseUrl,
      apiKey,
      fetch:
        process.env.MODEL_DISABLE_THINKING === "true" ? noThinkFetch : undefined,
    });
    return provider.chat(model);
  }
  const firstSeparator = model.search(/[:/]/);
  const candidatePrefix = firstSeparator >= 0 ? canonicalProvider(model.slice(0, firstSeparator)) : undefined;
  // A colon in a bare model name can introduce a variant, such as ':free'.
  // Only supported provider prefixes use colon syntax; publishers use '/'.
  const separator = firstSeparator >= 0 && (model[firstSeparator] === "/" ||
    ["openai", "openrouter", "anthropic", "google"].includes(candidatePrefix || ""))
    ? firstSeparator : -1;
  const prefix = separator >= 0 ? candidatePrefix : undefined;
  const modelId = separator >= 0 ? model.slice(separator + 1).trim() : model;
  if (!modelId) {
    throw new Error("MODEL must include a non-empty model identifier.");
  }
  // Preserve the original automatic router switch for existing .env files.
  const provider = canonicalProvider(process.env.MODEL_PROVIDER || "") ||
    (process.env.OPENROUTER_API_KEY ? "openrouter" : prefix || "openai");
  const keyNames: { [provider: string]: string | undefined } = {
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
  };
  const keyName = Object.hasOwn(keyNames, provider) ? keyNames[provider] : undefined;
  if (!keyName) {
    throw new Error(`Unsupported model provider '${provider}'. Set MODEL_PROVIDER to openai, openrouter, anthropic, or google.`);
  }
  if (provider !== "openrouter" && prefix && prefix !== provider) {
    throw new Error(`MODEL provider '${prefix}' does not match MODEL_PROVIDER '${provider}'.`);
  }
  const apiKey = process.env[keyName];
  if (!apiKey || apiKey === "stub-replace-me") {
    throw new Error(`${keyName} is required for ${provider}.`);
  }

  if (provider === "openrouter") {
    const openRouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      headers: {
        "HTTP-Referer": process.env.PUBLIC_APP_URL ?? "https://aitinkerers.org",
        "X-OpenRouter-Title": process.env.APP_TITLE ?? "Agents, Everywhere",
      },
    });
    // Change only a provider separator; keep suffixes such as ':free' intact.
    const slug = `${prefix || "openai"}/${modelId}`;
    // AI SDK OpenAI v3 defaults to /responses. OpenRouter uses /chat/completions.
    return openRouter.chat(slug);
  }

  return `${provider}:${modelId}`;
}
