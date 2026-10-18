import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** The .env files Next.js and OpenNext load, checked in this order (OI-30). */
const ROLLOUT_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
];
const ROLLOUT_ASSIGNMENT = /^\s*(?:export\s+)?CALCULATOR_V2_ROLLOUT\s*=/m;

/** Check public build inputs without logging their values or reading private credentials. */
export function checkReleaseEnvironment(env) {
  const required = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_KARMAN_LAUNCHED",
  ];
  const problems = required.filter((key) => !env[key]?.trim()).map((key) => `${key} is missing`);
  if (problems.length) return problems;

  if (env.NEXT_PUBLIC_APP_URL !== "https://karmanprep.com")
    problems.push("NEXT_PUBLIC_APP_URL must identify the production site");
  if (env.NEXT_PUBLIC_KARMAN_LAUNCHED !== "true")
    problems.push("NEXT_PUBLIC_KARMAN_LAUNCHED must be true for a public release");
  if (!/^pk_(test|live)_[A-Za-z0-9_-]+$/.test(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY))
    problems.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key");
  if (required.some((key) => /placeholder|local_build_unused/i.test(env[key])))
    problems.push("Public release inputs cannot contain build placeholders");

  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hosted = url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
    if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
      // Supabase's newer publishable keys are opaque: no role or project reference inside, so
      // only the URL can be checked (the secret counterpart is sb_secret_, rejected below).
      if (!hosted) problems.push("Supabase public URL must be the project's https supabase.co URL");
    } else {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
      if (!hosted || payload.role !== "anon" || payload.ref !== url.hostname.split(".")[0])
        problems.push("Supabase public URL and anon key must identify the same project");
    }
  } catch {
    problems.push("Supabase public URL or anon key is malformed");
  }
  return problems;
}

/** One problem per .env file in `dir` that defines CALCULATOR_V2_ROLLOUT. OpenNext bakes these
 *  files into the Worker, so the rollout lives only in the Worker binding (AR-6, OI-30). The
 *  value is never read into a message. */
export function checkRolloutNotInEnvFiles(dir) {
  return ROLLOUT_ENV_FILES.filter((file) => {
    const path = join(dir, file);
    return existsSync(path) && ROLLOUT_ASSIGNMENT.test(readFileSync(path, "utf8"));
  }).map(
    (file) =>
      `${file} defines CALCULATOR_V2_ROLLOUT; set it with wrangler secret put or in the shell, never in a .env file`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = [
    ...checkReleaseEnvironment(process.env),
    ...checkRolloutNotInEnvFiles(process.cwd()),
  ];
  if (problems.length) {
    console.error("Release build stopped before compilation:\n" + problems.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Public release build inputs validated. Values are not logged.");
  }
}
