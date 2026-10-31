import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findTheme, themeCssVariables } from "@/lib/themes/palettes";

const ROLES_CSS = "src/components/learn/figures/figure-roles.css";
const css = readFileSync(path.join(process.cwd(), ROLES_CSS), "utf8");

describe("figure theme roles", () => {
  it.each(["ivory", "observatory"])("in %s the text and canvas tokens differ", (id) => {
    const vars = themeCssVariables(findTheme(id)!);
    expect(vars["--k-ivory"]).toBeTruthy();
    expect(vars["--k-night"]).toBeTruthy();
    expect(vars["--k-ivory"]).not.toBe(vars["--k-night"]);
  });

  it("--figure-ink uses --k-ivory and never --k-night", () => {
    const decl = css.match(/--figure-ink:\s*([^;]+);/);
    expect(decl).not.toBeNull();
    expect(decl![1]).toContain("--k-ivory");
    expect(decl![1]).not.toContain("--k-night");
  });

  it("no figure role is derived from the canvas token", () => {
    const roles =
      css.match(/--figure-(ink|ink-muted|grid|fill-faint|fill-shade|highlight):[^;]+;/g) ?? [];
    expect(roles).toHaveLength(6);
    for (const r of roles) expect(r).not.toContain("--k-night");
  });

  it("the roles sit under :root:root, so they outrank the legacy --figure-grid", () => {
    expect(css).toMatch(/^:root:root\s*\{/m);
    expect(css.match(/\{/g)).toHaveLength(1);
  });

  it("FigureView imports the roles sheet", () => {
    const view = readFileSync(
      path.join(process.cwd(), "src/components/learn/figures/FigureView.tsx"),
      "utf8"
    );
    expect(view).toMatch(/^import "\.\/figure-roles\.css";$/m);
  });
});
