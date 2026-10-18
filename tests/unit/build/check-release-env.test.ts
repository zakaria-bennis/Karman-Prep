import { describe, expect, it } from "vitest";
import { checkReleaseEnvironment } from "../../../scripts/build/check-release-env.mjs";

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
  it("rejects private and mismatched database keys without echoing them", () => {
    for (const key of [anonKey("service_role"), anonKey("anon", "another"), "sb_secret_private"]) {
      const errors = checkReleaseEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: key });
      expect(errors.length).toBeGreaterThan(0);
      expect(JSON.stringify(errors)).not.toContain(key);
    }
  });
});
