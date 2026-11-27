// `npm run studio -- <command>`: how Claude picks up the founder's Page Studio notes and reports back.
// Reads the service key from .env.local (or the environment) and never prints it. Run it on a
// machine that can reach the site's database. See docs/page-studio.md.
//
//   list [--all]                 the brief for notes sent to Claude (--all adds notes already in a PR)
//   claim <note id…>             mark notes as being worked on ("Claude is on it")
//   ask <note id> "question"     ask the founder about one note; it shows in the studio as "Claude asked"
//   pr <pull request url> <id…>  link the pull request that carries these notes
//   done <note id…>              mark notes done
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { digest } from "../../src/lib/page-studio/digest";
import { insertMessage, readNotes, updateNotes } from "../../src/lib/page-studio/rows";
import type { NoteStatus } from "../../src/lib/page-studio/schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PR_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+$/;
const OPEN: NoteStatus[] = ["sent", "question", "working"];

function env(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m?.[1] !== name) continue;
    const v = m[2].trim();
    return /^(["']).*\1$/.test(v) ? v.slice(1, -1) : v;
  }
  return undefined;
}

function client(): SupabaseClient {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) fail("The database address or service key is missing from .env.local.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function ids(list: string[]): string[] {
  if (!list.length) fail("Give at least one note id.");
  const bad = list.filter((id) => !UUID.test(id));
  if (bad.length) fail(`Not a note id: ${bad.join(", ")}`);
  return list;
}

async function report(db: SupabaseClient, wanted: string[], changed: string[], what: string) {
  const missed = wanted.filter((id) => !changed.includes(id));
  console.log(`${what}: ${changed.length} note${changed.length === 1 ? "" : "s"}.`);
  if (!missed.length) return;
  const notes = await readNotes(db, {
    ids: missed,
    statuses: [...OPEN, "draft", "in_pr", "done", "dismissed"],
  });
  for (const id of missed) {
    const n = notes.find((x) => x.id === id);
    console.log(`  skipped ${id}: ${n ? `it is ${n.status}` : "no such note"}`);
  }
}

async function main() {
  const [command = "list", ...rest] = process.argv.slice(2);
  const db = client();

  if (command === "list") {
    const statuses: NoteStatus[] = rest.includes("--all") ? [...OPEN, "in_pr"] : OPEN;
    console.log(digest(await readNotes(db, { statuses })));
    return;
  }
  if (command === "claim") {
    const want = ids(rest);
    await report(
      db,
      want,
      await updateNotes(db, want, { status: "working" }, ["sent", "question"]),
      "Working on"
    );
    return;
  }
  if (command === "ask") {
    const [id, ...words] = rest;
    ids([id ?? ""]);
    const question = words.join(" ").trim();
    if (!question) fail('Add the question, in quotes: npm run studio -- ask <note id> "question"');
    if (question.length > 4000) fail("Keep the question under 4,000 characters.");
    const changed = await updateNotes(db, [id], { status: "question" }, OPEN);
    if (!changed.length) return report(db, [id], changed, "Asked about");
    await insertMessage(db, id, "claude", question);
    console.log("Asked. The founder sees it on the note in the studio.");
    return;
  }
  if (command === "pr") {
    const [url, ...list] = rest;
    if (!PR_URL.test(url ?? ""))
      fail("Give the pull request's GitHub address first, then the note ids.");
    const want = ids(list);
    await report(
      db,
      want,
      await updateNotes(db, want, { status: "in_pr", pr_url: url }, OPEN),
      "Linked"
    );
    return;
  }
  if (command === "done") {
    const want = ids(rest);
    await report(
      db,
      want,
      await updateNotes(db, want, { status: "done" }, [...OPEN, "in_pr"]),
      "Done"
    );
    return;
  }
  fail(`Unknown command "${command}". Use list, claim, ask, pr or done.`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
