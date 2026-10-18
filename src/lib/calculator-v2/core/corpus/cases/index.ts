// Static registry of the golden corpus case files (PR-39; 01-interfaces.md section 2.1 order).
// Plain static imports only, so Vitest, tsx scripts and Playwright specs all load it alike.

import type { CorpusCase } from "../types";
import parseLiterals from "./parse-literals";
import parseOperators from "./parse-operators";
import parseCalls from "./parse-calls";
import parseRelations from "./parse-relations";
import parseErrors from "./parse-errors";
import printer from "./printer";
import satForms from "./sat-forms";
import classifyRows from "./classify-rows";
import classifyDefinitions from "./classify-definitions";
import classifyRelations from "./classify-relations";
import displayNumbers from "./display-numbers";
import displayComplex from "./display-complex";
import domainReal from "./domain-real";
import domainFunctions from "./domain-functions";
import keys from "./keys";
import graph from "./graph";
import questionDialect from "./question-dialect";
import paste from "./paste";

export const CORPUS_FILES: Readonly<Record<string, readonly CorpusCase[]>> = {
  "parse-literals": parseLiterals,
  "parse-operators": parseOperators,
  "parse-calls": parseCalls,
  "parse-relations": parseRelations,
  "parse-errors": parseErrors,
  printer,
  "sat-forms": satForms,
  "classify-rows": classifyRows,
  "classify-definitions": classifyDefinitions,
  "classify-relations": classifyRelations,
  "display-numbers": displayNumbers,
  "display-complex": displayComplex,
  "domain-real": domainReal,
  "domain-functions": domainFunctions,
  keys,
  graph,
  "question-dialect": questionDialect,
  paste,
};
