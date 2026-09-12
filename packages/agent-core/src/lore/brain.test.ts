/**
 * The brain is the product, so it is the thing most worth testing offline.
 * These run with no model, no network, and no credentials — a temp dir per test.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  captureEntry,
  readProject,
  listProjects,
  slugifyProject,
  projectPath,
} from "./brain";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "lore-brain-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("slugifyProject", () => {
  it("maps distinct names to distinct slugs and same name to same slug", () => {
    assert.equal(slugifyProject("Auth Service"), "auth-service");
    assert.equal(slugifyProject("auth  service!"), "auth-service");
    assert.equal(slugifyProject("Billing / EU"), "billing-eu");
  });
  it("refuses a name with no usable characters", () => {
    assert.throws(() => slugifyProject("!!!"), /no usable characters/);
  });
});

describe("captureEntry", () => {
  it("creates the file with a header and a cited entry on first capture", async () => {
    const result = await captureEntry({
      project: "Auth Service",
      kind: "decision",
      summary: "Switch auth from JWT to server-side sessions.",
      owner: "Dana",
      openQuestion: "How does the mobile app refresh?",
      source: { platform: "slack", author: "priya", ref: "1699.0001" },
      dir,
    });

    assert.equal(result.createdFile, true);
    assert.equal(result.path, projectPath("Auth Service", dir));
    const contents = await readFile(result.path, "utf8");
    // Frontmatter + H1 both name the project, so the vault and generated wiki agree.
    assert.match(contents, /^---\ntitle: Auth Service/);
    assert.match(contents, /^# Auth Service/m);
    assert.match(contents, /Switch auth from JWT to server-side sessions\./);
    // Owners and speakers become [[wikilinks]] so the plugin builds entity pages.
    assert.match(contents, /\*\*Owner:\*\* \[\[Dana\]\]/);
    assert.match(contents, /\*\*Open question:\*\* How does the mobile app refresh\?/);
    // The receipt: platform + author + ref must all survive to disk.
    assert.match(contents, /platform=slack/);
    assert.match(contents, /author=\[\[priya\]\]/);
    assert.match(contents, /ref=1699\.0001/);
  });

  it("appends to the same file on a second capture without a second header", async () => {
    await captureEntry({
      project: "Auth Service",
      kind: "decision",
      summary: "First decision.",
      source: { platform: "slack" },
      dir,
    });
    const second = await captureEntry({
      project: "Auth Service",
      kind: "open_question",
      summary: "Second item.",
      source: { platform: "slack" },
      dir,
    });
    assert.equal(second.createdFile, false);
    const contents = await readFile(second.path, "utf8");
    assert.equal(contents.match(/^# Auth Service/gm)?.length, 1);
    assert.match(contents, /First decision\./);
    assert.match(contents, /Second item\./);
  });

  it("rejects an empty summary rather than writing a hollow entry", async () => {
    await assert.rejects(
      () =>
        captureEntry({
          project: "Auth Service",
          kind: "context",
          summary: "   ",
          source: { platform: "slack" },
          dir,
        }),
      /empty summary/,
    );
    assert.equal(existsSync(projectPath("Auth Service", dir)), false);
  });
});

describe("readProject", () => {
  it("reports exists:false and empty markdown for a project with no brain", async () => {
    const read = await readProject("nope", dir);
    assert.equal(read.exists, false);
    assert.equal(read.markdown, "");
  });
  it("returns the full markdown once something is captured", async () => {
    await captureEntry({
      project: "Billing",
      kind: "decision",
      summary: "Move invoices to the new ledger.",
      source: { platform: "teams-transcript", ref: "standup#12" },
      dir,
    });
    const read = await readProject("Billing", dir);
    assert.equal(read.exists, true);
    assert.match(read.markdown, /Move invoices to the new ledger\./);
  });
});

describe("listProjects", () => {
  it("lists every project that has a brain with its title", async () => {
    await captureEntry({
      project: "Auth Service",
      kind: "context",
      summary: "a",
      source: { platform: "slack" },
      dir,
    });
    await captureEntry({
      project: "Billing",
      kind: "context",
      summary: "b",
      source: { platform: "slack" },
      dir,
    });
    const projects = await listProjects(dir);
    const slugs = projects.map((p) => p.slug).sort();
    assert.deepEqual(slugs, ["auth-service", "billing"]);
    const auth = projects.find((p) => p.slug === "auth-service");
    assert.equal(auth?.title, "Auth Service");
  });
  it("returns an empty list when no brain directory exists yet", async () => {
    const projects = await listProjects(path.join(dir, "missing"));
    assert.deepEqual(projects, []);
  });
});
