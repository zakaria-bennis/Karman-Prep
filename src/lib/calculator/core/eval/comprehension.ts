// NM-37 comprehensions, as Desmos evaluates them (captured 2026-10-20): `[e \operatorname{for}
// n=L, m=M]` evaluates e for every combination of the elements of L and M, the first name varying
// fastest (`[a+b \operatorname{for} a=[1,2],b=[3,4]]` is [4,5,5,6]), and makes one list of the
// results (makeList's rules: no nested lists, no mixing points and numbers). More than
// MAX_LIST_ELEMENTS combinations is `list-too-long`. A definition that is not a list (analysis
// reports it) makes the whole value undefined. Pure TypeScript: no DOM (AR-44).

import type { Deadline } from "../deadline";
import { ListError, makeList, MAX_LIST_ELEMENTS } from "./lists";
import { UNDEFINED, type Value } from "./values";

export function comprehensionValue(
  names: readonly string[],
  lists: readonly Value[],
  body: (bound: Record<string, Value>) => Value,
  deadline: Deadline
): Value {
  const elements: Value[][] = [];
  for (const list of lists) {
    if (list.type !== "list") return UNDEFINED;
    elements.push(list.value);
  }
  const total = elements.reduce((n, items) => n * items.length, 1);
  if (total > MAX_LIST_ELEMENTS) throw new ListError("list-too-long");
  const results: Value[] = [];
  for (let k = 0; k < total; k++) {
    deadline.check();
    const bound: Record<string, Value> = {};
    let rest = k;
    names.forEach((name, j) => {
      const items = elements[j];
      bound[name] = items[rest % items.length];
      rest = Math.floor(rest / items.length);
    });
    results.push(body(bound));
  }
  return makeList(results);
}
