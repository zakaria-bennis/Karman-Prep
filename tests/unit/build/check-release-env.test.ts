import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkReleaseEnvironment,
  checkRolloutNotInEnvFiles,
} from "../../../scripts/build/check-release-env.mjs";

const anonKey = (role = "anon", ref = "synthetic") =>
  `header.${Buffer.from(JSON.stringify({ role, ref })).toString("base64url")}.signature`;
const valid = {
  NEXT_PUBLIC_APP_URL: "https://karmanprep.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_synthetic",
  NEXT_PUBLIC_KARMAN_LAUNCHED: "true",
};

describe("production release build inputs", () => {
  it("accepts matched public inputs without needing a private credential", () => {
    expect(checkReleaseEnvironment(valid)).toEqual([]);
  });
  it("rejects every missing public input before compilation", () => {
    for (const key of Object.keys(valid))
      expect(checkReleaseEnvironment({ ...valid, [key]: "" })).toContain(`${key} is missing`);
  });
  it("rejects placeholders and an accidental maintenance-mode release", () => {
    expect(
      checkReleaseEnvironment({
        ...valid,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
      })
    ).not.toEqual([]);
    expect(checkReleaseEnvironment({ ...valid, NEXT_PUBLIC_KARMAN_LAUNCHED: "false" })).not.toEqual(
      []
    );
  });
  it("accepts Supabase's publishable key format, which carries no project reference", () => {
    const publishable = "sb_publishable_" + "a".repeat(31);
    expect(
      checkReleaseEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: publishable })
    ).toEqual([]);
    for (const url of ["http://synthetic.supabase.co", "https://synthetic.example.com"]) {
      const errors = checkReleaseEnvironment({
        ...valid,
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: publishable,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(JSON.stringify(errors)).not.toContain(publishable);
    }
  });
  it("rejects private and mismatched database keys without echoing them", () => {
    for (const key of [anonKey("service_role"), anonKey("anon", "another"), "sb_secret_private"]) {
      const errors = checkReleaseEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: key });
      expect(errors.length).toBeGreaterThan(0);
      expect(JSON.stringify(errors)).not.toContain(key);
    }
  });
});

const tempDirs: string[] = [];
const envDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "karman-env-"));
  tempDirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("calculator rollout stays out of .env files", () => {
  it("AR-6, OI-30 a .env file that defines CALCULATOR_V2_ROLLOUT stops the release build", () => {
    const dir = envDir();
    expect(checkRolloutNotInEnvFiles(dir)).toEqual([]);
    writeFileSync(join(dir, ".env.local"), "FOO=1\n# CALCULATOR_V2_ROLLOUT=admins\n");
    writeFileSync(join(dir, ".env.example"), "CALCULATOR_V2_ROLLOUT=admins\n");
    expect(checkRolloutNotInEnvFiles(dir)).toEqual([]);
    writeFileSync(join(dir, ".env.production"), "export CALCULATOR_V2_ROLLOUT=everyone\n");
    writeFileSync(join(dir, ".env"), "CALCULATOR_V2_ROLLOUT = admins\n");
    const problems = checkRolloutNotInEnvFiles(dir);
    expect(problems).toEqual(
      [".env", ".env.production"].map(
        (f) =>
          `${f} defines CALCULATOR_V2_ROLLOUT; set it with wrangler secret put or in the shell, never in a .env file`
      )
    );
    expect(JSON.stringify(problems)).not.toMatch(/everyone|=\s*admins/);
  });

  it("AR-6, OI-30 the release CLI runs the public-input and rollout checks together", () => {
    const dir = envDir();
    // Next's types make NODE_ENV required on ProcessEnv; the child gets only these keys.
    const childEnv: Partial<NodeJS.ProcessEnv> = { ...valid, PATH: process.env.PATH };
    const run = () =>
      spawnSync(process.execPath, [resolve("scripts/build/check-release-env.mjs")], {
        cwd: dir,
        env: childEnv as NodeJS.ProcessEnv,
        encoding: "utf8",
      });
    expect(run().status).toBe(0);
    writeFileSync(join(dir, ".env.production.local"), "CALCULATOR_V2_ROLLOUT=admins\n");
    const stopped = run();
    expect(stopped.status).toBe(1);
    expect(stopped.stderr).toContain(".env.production.local defines CALCULATOR_V2_ROLLOUT");
  });
});
