// Kept source identities: a QA correction keeps the live row's stored identity.
//
// A QA correction rewrites a question `k qa hide` took off the site in place, on
// the same quiz_questions row (scripts/import-tools/kimport/qa_correct.py), so it
// never creates a source identity. Rows imported before the strict rule (the
// 2023-03 and 2023-05 forms) carry identities that rule cannot read: module
// "UNSPECIFIED", section "writing". A row may keep such an identity verbatim only
// when it names, exactly, the identity of a QA-hidden live row the caller
// supplies (stage-rows.ts <keep-identities.json>, built by kimport from the
// export). New rows never get one: without a matching entry the strict rule
// (math/reading, M1/M2) applies as before. The correction's stable id is checked
// against the hidden row's answer key evidence later, by qa_correct.check_row.

declare const keptBrand: unique symbol;
/** A section or module value copied verbatim from a live row's stored identity. */
export type KeptSourceValue = string & { readonly [keptBrand]: true };

/** The stored source tuple of one QA-hidden live row. */
export interface KeptSourceIdentity {
  source_version: string;
  source_section: string;
  source_module: string;
  source_question_number: number;
}

/** Read the keep-identities file (a JSON array of stored source tuples). */
export function parseKeptIdentities(value: unknown): KeptSourceIdentity[] {
  if (!Array.isArray(value)) throw new Error("kept identities: expected a JSON array");
  return value.map((entry, index) => {
    const o = (entry ?? {}) as Record<string, unknown>;
    const ok =
      typeof o.source_version === "string" &&
      /^[a-f0-9]{64}$/.test(o.source_version) &&
      typeof o.source_section === "string" &&
      o.source_section !== "" &&
      typeof o.source_module === "string" &&
      o.source_module !== "" &&
      Number.isInteger(o.source_question_number) &&
      (o.source_question_number as number) > 0;
    if (!ok) throw new Error(`kept identities: entry ${index + 1} is not a stored source tuple`);
    return {
      source_version: o.source_version as string,
      source_section: o.source_section as string,
      source_module: o.source_module as string,
      source_question_number: o.source_question_number as number,
    };
  });
}

/** The live identity this row keeps, when its own source_section, source_module
 * and source_question_number (and the source file's version) equal one exactly. */
export function keptIdentityFor(
  row: Record<string, unknown>,
  sourceVersion: string | undefined,
  kept: readonly KeptSourceIdentity[] | undefined
): { section: KeptSourceValue; module: KeptSourceValue } | null {
  if (!sourceVersion || !kept?.length) return null;
  const hit = kept.find(
    (k) =>
      k.source_version === sourceVersion &&
      k.source_section === row.source_section &&
      k.source_module === row.source_module &&
      k.source_question_number === row.source_question_number
  );
  if (!hit) return null;
  return {
    section: hit.source_section as KeptSourceValue,
    module: hit.source_module as KeptSourceValue,
  };
}
