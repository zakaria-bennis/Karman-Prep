// Next.js loads the root not-found.tsx, and every stylesheet it reaches, on every route of the app. When it
// imported the marketing site's styles, each student page carried them too. This keeps it self-contained.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), "src/app", file), "utf8");
const imports = (source: string) =>
  [...source.matchAll(/^import\s[^"']*["']([^"']+)["']/gm)].map((match) => match[1]);

describe("the app-wide 404 page", () => {
  it("imports no stylesheet and nothing that draws the marketing site's frame", () => {
    for (const path of imports(read("not-found.tsx"))) {
      expect(path).not.toMatch(/\.css$|site-styles|components\/site\/(?!routes$)/);
    }
  });

  it("leaves the marketing styles to the (site) layout alone", () => {
    expect(imports(read("(site)/layout.tsx"))).toContain("./site-styles");
    expect(imports(read("(site)/not-found.tsx")).join("\n")).not.toMatch(/\.css$|site-styles/);
  });
});
