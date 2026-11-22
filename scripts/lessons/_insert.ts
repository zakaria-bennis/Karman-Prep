// one-off: inserts check-ins from a JSON file { id: [checkIn per example] } into the lesson files
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";
const data = JSON.parse(readFileSync(process.argv[2], "utf8")) as Record<string, unknown[]>;
for (const [id, list] of Object.entries(data)) {
  const p = `src/lib/lessons/skills/${id}.ts`;
  const src = readFileSync(p, "utf8");
  const sf = ts.createSourceFile(p, src, ts.ScriptTarget.Latest, true);
  let arr: ts.ArrayLiteralExpression | undefined;
  const visit = (n: ts.Node) => {
    if (ts.isPropertyAssignment(n) && n.name.getText(sf) === "examples" && ts.isArrayLiteralExpression(n.initializer)) arr = n.initializer;
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!arr) throw new Error(`${id}: no examples`);
  const els = arr.elements as ts.NodeArray<ts.ObjectLiteralExpression>;
  if (els.length !== list.length) throw new Error(`${id}: ${els.length} examples, ${list.length} check-ins`);
  if (els.some((e) => e.properties.some((pr) => pr.name?.getText(sf) === "checkIn"))) throw new Error(`${id}: already has check-ins`);
  let out = src;
  for (let i = els.length - 1; i >= 0; i--) {
    const end = els[i].getEnd() - 1; // the closing brace
    const before = out.slice(0, end).replace(/,?\s*$/, "");
    out = `${before},\n checkIn: ${JSON.stringify(list[i])},\n${out.slice(end)}`;
  }
  writeFileSync(p, out);
  console.log(id, list.length);
}
