import { describe, expect, it } from "vitest";
import { portalFor, safeNext } from "./portal-home";

describe("where Go to your portal leads", () => {
  it("sends each kind of account to its own portal", () => {
    expect(portalFor({ role: "student", schoolMember: false })).toBe("/dashboard/student");
    expect(portalFor({ role: "parent", schoolMember: false })).toBe("/dashboard/parent");
    expect(portalFor({ role: "tutor", schoolMember: false })).toBe("/tutor");
    expect(portalFor({ role: "affiliate_tutor", schoolMember: false })).toBe("/tutor");
    expect(portalFor({ role: "student", schoolMember: true })).toBe("/school");
  });
  it("gives a new account, and the site's admin, the student portal", () => {
    expect(portalFor({ role: null, schoolMember: false })).toBe("/dashboard/student");
    expect(portalFor({ role: "admin", schoolMember: false })).toBe("/dashboard/student");
  });
  it("follows a redirect only inside the site, and never back to sign-in", () => {
    expect(safeNext("https://karmanprep.com/dashboard/student")).toBe("/dashboard/student");
    expect(safeNext("/tutor?x=1")).toBe("/tutor?x=1");
    expect(safeNext("https://evil.example/x")).toBe("/portal");
    expect(safeNext("/auth/sign-in")).toBe("/portal");
    expect(safeNext(null)).toBe("/portal");
  });
});
