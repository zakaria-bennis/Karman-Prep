import { pathToFileURL } from "node:url";

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
    const payload = JSON.parse(
      Buffer.from(env.NEXT_PUBLIC_SUPABASE_ANON_KEY.split(".")[1], "base64url").toString()
    );
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".supabase.co") ||
      payload.role !== "anon" ||
      payload.ref !== url.hostname.split(".")[0]
    )
      problems.push("Supabase public URL and anon key must identify the same project");
  } catch {
    problems.push("Supabase public URL or anon key is malformed");
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkReleaseEnvironment(process.env);
  if (problems.length) {
    console.error("Release build stopped before compilation:\n" + problems.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Public release build inputs validated. Values are not logged.");
  }
}
