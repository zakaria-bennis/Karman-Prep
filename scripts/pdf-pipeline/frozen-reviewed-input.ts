import { z } from "zod";
import { verifyApprovedTagRow } from "./approved-tag-binding";
import { canonicalJson, sha256Hex } from "./reviewed-input-hash";

export { canonicalJson, sha256Hex } from "./reviewed-input-hash";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const rowPin = z
  .object({
    stable_question_id: z.string().min(1),
    row_sha256: sha256,
    content_sha256: sha256,
    student_content_sha256: sha256,
  })
  .strict();
const frozenInputManifest = z
  .object({
    schema_version: z.literal(1),
    reviewed_json_sha256: sha256,
    source_pdf_sha256: sha256,
    rows: z.array(rowPin).min(1),
  })
  .strict();

export type FrozenInputManifest = z.infer<typeof frozenInputManifest>;

export function verifyFrozenReviewedInput(args: {
  manifestBytes: Uint8Array;
  expectedManifestSha256: string;
  jsonBytes: Uint8Array;
  pdfBytes: Uint8Array;
  rows: unknown[];
}): { ok: true; verifiedRows: number } | { ok: false; error: string } {
  if (!sha256.safeParse(args.expectedManifestSha256).success) {
    return { ok: false, error: "Invalid frozen manifest SHA-256" };
  }
  if (sha256Hex(args.manifestBytes) !== args.expectedManifestSha256) {
    return {
      ok: false,
      error: "Frozen manifest bytes differ from the separately supplied SHA-256",
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(args.manifestBytes));
  } catch {
    return { ok: false, error: "Frozen manifest is not JSON" };
  }
  const result = frozenInputManifest.safeParse(parsed);
  if (!result.success) return { ok: false, error: "Frozen manifest schema is invalid" };
  const manifest = result.data;
  if (sha256Hex(args.jsonBytes) !== manifest.reviewed_json_sha256) {
    return { ok: false, error: "Reviewed JSON bytes differ from frozen manifest" };
  }
  if (sha256Hex(args.pdfBytes) !== manifest.source_pdf_sha256) {
    return { ok: false, error: "Source PDF bytes differ from frozen manifest" };
  }
  if (args.rows.length !== manifest.rows.length) {
    return { ok: false, error: "Reviewed row count differs from frozen manifest" };
  }
  const seen = new Set<string>();
  for (const [index, value] of args.rows.entries()) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: `Row ${index + 1} is not an object` };
    }
    const row = value as Record<string, unknown>;
    const pin = manifest.rows[index];
    try {
      verifyApprovedTagRow(row);
    } catch (error) {
      return { ok: false, error: `Row ${index + 1} ${String((error as Error).message)}` };
    }
    if (row.stable_question_id !== pin.stable_question_id || seen.has(pin.stable_question_id)) {
      return { ok: false, error: `Row ${index + 1} identity differs or repeats` };
    }
    seen.add(pin.stable_question_id);
    if (sha256Hex(canonicalJson(row)) !== pin.row_sha256) {
      return { ok: false, error: `Row ${index + 1} content differs from frozen manifest` };
    }
    const version = row.source_version;
    if (!version || typeof version !== "object" || Array.isArray(version)) {
      return { ok: false, error: `Row ${index + 1} lacks frozen source content version` };
    }
    const source = version as Record<string, unknown>;
    if (
      source.content_sha256 !== pin.content_sha256 ||
      source.student_content_sha256 !== pin.student_content_sha256
    ) {
      return { ok: false, error: `Row ${index + 1} source content version differs` };
    }
    if (row.difficulty_content_sha256 !== source.student_content_sha256) {
      return {
        ok: false,
        error: `Row ${index + 1} difficulty rates a different student content version`,
      };
    }
  }
  return { ok: true, verifiedRows: args.rows.length };
}
