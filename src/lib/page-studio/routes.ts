// Matching real addresses to the page list, and filling a page's [params]. Pure functions, used by
// the studio in the browser and by the tests.
import { STUDIO_PAGES, type StudioPage } from "./inventory";

/** The [param] names in a path template, in order. */
export function paramNames(template: string): string[] {
  return [...template.split("?")[0].matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
}

/** Fill a template's params. Returns null while any param is still unknown. */
export function fillPath(
  template: string,
  values: Record<string, string | undefined>
): string | null {
  let missing = false;
  const filled = template.replace(/\[([^\]]+)\]/g, (_, name: string) => {
    const v = values[name];
    if (!v) missing = true;
    return v ? encodeURIComponent(v) : "";
  });
  return missing ? null : filled;
}

interface Compiled {
  page: StudioPage;
  re: RegExp;
  names: string[];
  query: Record<string, string>;
  /** More literal characters win over params when two templates fit. */
  weight: number;
}

function compile(page: StudioPage): Compiled {
  const [pathPart, queryPart] = page.path.split("?");
  const names = paramNames(pathPart);
  const pattern = pathPart
    .split(/(\[[^\]]+\])/)
    .map((piece) => (piece.startsWith("[") ? "([^/]+)" : piece.replace(/[.*+?^${}()|\\]/g, "\\$&")))
    .join("");
  const query = Object.fromEntries(new URLSearchParams(queryPart ?? ""));
  const weight = pathPart.replace(/\[[^\]]+\]/g, "").length + Object.keys(query).length * 100;
  return { page, re: new RegExp(`^${pattern}/?$`), names, query, weight };
}

const COMPILED: Compiled[] = STUDIO_PAGES.map(compile).sort((a, b) => b.weight - a.weight);

export interface RouteMatch {
  page: StudioPage;
  params: Record<string, string>;
}

/**
 * Which listed page an address is (path plus query), and its param values. The student portal is
 * one address whose tab is in ?page=, so the query decides there.
 */
export function matchRoute(url: string): RouteMatch | null {
  const parsed = new URL(url, "http://studio.local");
  const path = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");
  for (const c of COMPILED) {
    const m = c.re.exec(path);
    if (!m) continue;
    const fits = Object.entries(c.query).every(([k, v]) => parsed.searchParams.get(k) === v);
    if (!fits) continue;
    const params = Object.fromEntries(c.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
    return { page: c.page, params };
  }
  return null;
}
