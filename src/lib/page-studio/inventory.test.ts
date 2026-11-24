import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { NOT_LISTED, STUDIO_PAGES } from "./inventory";
import { fillPath, matchRoute, paramNames } from "./routes";
import { sampleValues } from "./samples";

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pageFiles(full);
    return name === "page.tsx" ? [relative(process.cwd(), full).split("\\").join("/")] : [];
  });
}

describe("page studio inventory", () => {
  const files = pageFiles(join(process.cwd(), "src/app"));
  const listed = new Set(STUDIO_PAGES.map((p) => p.file));

  it("lists every page a visitor, student, parent, tutor, teacher or admin can see", () => {
    const missing = files.filter(
      (f) => !listed.has(f) && !NOT_LISTED.some((n) => f.startsWith(n.prefix))
    );
    expect(missing).toEqual([]);
  });

  it("points only at page files that exist", () => {
    const gone = [...listed].filter((f) => !files.includes(f));
    expect(gone).toEqual([]);
  });

  it("has unique ids", () => {
    const ids = STUDIO_PAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("can fill every fixed example, and each sample exists", () => {
    const samples = sampleValues();
    for (const value of Object.values(samples)) expect(value).not.toBe("");
    for (const page of STUDIO_PAGES) {
      if (!page.samples) continue;
      const values = Object.fromEntries(
        Object.entries(page.samples).map(([k, key]) => [k, samples[key]])
      );
      expect(fillPath(page.path, values), page.id).not.toBeNull();
    }
  });

  it("gives every data param a page to open first, or says how to reach it", () => {
    for (const page of STUDIO_PAGES) {
      const open = paramNames(page.path).filter((n) => !page.samples?.[n]);
      if (open.length) expect(page.from ?? page.hint, page.id).toBeTruthy();
    }
  });
});

describe("page studio routes", () => {
  it("tells the student portal's tabs apart by ?page=", () => {
    expect(matchRoute("/dashboard/student?page=mistakes")?.page.id).toBe("student.mistakes");
    expect(matchRoute("/dashboard/student?page=account&x=1")?.page.id).toBe("student.account");
    expect(matchRoute("/dashboard/student?welcome=1")?.page.id).toBe("student.welcome");
  });

  it("reads params from a real address", () => {
    const m = matchRoute("/dashboard/parent/abc-123/progress");
    expect(m?.page.id).toBe("parent.progress");
    expect(m?.params).toEqual({ studentId: "abc-123" });
  });

  it("prefers fixed words over params", () => {
    expect(matchRoute("/dashboard/parent/settings")?.page.id).toBe("parent.settings");
    expect(matchRoute("/tutor/schedule")?.page.id).toBe("tutor.schedule");
    expect(matchRoute("/admin/questions/preview/rapid")?.page.id).toBe("admin.q-rapid");
  });

  it("matches the home page and unknown addresses", () => {
    expect(matchRoute("/")?.page.id).toBe("site.home");
    expect(matchRoute("/no/such/place")).toBeNull();
  });

  it("fills params and refuses missing ones", () => {
    expect(
      fillPath("/tutor/[studentId]/practice/[sessionId]", { studentId: "s1", sessionId: "p 2" })
    ).toBe("/tutor/s1/practice/p%202");
    expect(fillPath("/tutor/[studentId]", {})).toBeNull();
  });
});
