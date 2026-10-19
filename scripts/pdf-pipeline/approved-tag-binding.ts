import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { CLUSTER_BY_DOMAIN, domainFromSlug, isValidSlug } from "@/lib/question-bank/taxonomy";
import { canonicalJson, sha256Hex } from "./reviewed-input-hash";

const HASH = /^[a-f0-9]{64}$/;

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as JsonObject;
}

function exactHash(value: unknown, label: string): string {
  if (typeof value !== "string" || !HASH.test(value)) throw new Error(`${label} is not SHA-256`);
  return value;
}

/** The 39-skill identity is independent of the older 89 concept/node identities. */
export function verifyApprovedTagRow(row: JsonObject): void {
  const answer = object(row.reviewed_answer, "reviewed answer");
  const evidence = object(answer.evidence, "reviewed answer evidence");
  const tag = object(evidence.approved_tags, "approved tag evidence");
  const skill = CATALOG_SKILLS.find((candidate) => candidate.id === tag.catalog_skill_id);
  if (
    tag.schema_version !== 1 ||
    !skill ||
    tag.catalog_domain_id !== skill.domainId ||
    tag.domain_label !== skill.domainLabel ||
    tag.skill_label !== skill.label ||
    row.domain !== skill.domainId ||
    row.topic_cluster !== CLUSTER_BY_DOMAIN[skill.domainId as keyof typeof CLUSTER_BY_DOMAIN]
  ) {
    throw new Error("approved catalog skill/domain/topic binding differs");
  }
  exactHash(tag.tag_binding_manifest_sha256, "tag binding manifest hash");
  exactHash(tag.pilot_row_sha256, "original pilot row hash");
  exactHash(tag.content_sha256, "approved content hash");
  exactHash(tag.student_content_sha256, "approved student content hash");
  if (
    tag.stable_question_id !== row.stable_question_id ||
    tag.content_sha256 !== evidence.B_package_sha256 ||
    tag.student_content_sha256 !== row.difficulty_content_sha256 ||
    tag.student_content_sha256 !== evidence.B_student_sha256
  ) {
    throw new Error("approved tag evidence differs from the frozen row content");
  }
  if (row.source_version != null) {
    const source = object(row.source_version, "frozen source version");
    if (
      source.content_sha256 !== tag.content_sha256 ||
      source.student_content_sha256 !== tag.student_content_sha256
    ) {
      throw new Error("approved tag evidence differs from the frozen source version");
    }
  }
  if (row.concept_slug != null) {
    if (
      typeof row.concept_slug !== "string" ||
      !isValidSlug(row.concept_slug) ||
      domainFromSlug(row.concept_slug) !== skill.domainId
    ) {
      throw new Error("independently supplied legacy concept link conflicts with approved domain");
    }
  }
}

/** Only enrich the exact disposable 24-row batch named by D's pinned manifest. */
export function bindApprovedPrivatePilotTags(args: {
  batchBytes: Uint8Array;
  manifestBytes: Uint8Array;
  expectedManifestSha256: string;
  approvedTaxonomyBytes: Uint8Array;
}): JsonObject[] {
  if (sha256Hex(args.manifestBytes) !== exactHash(args.expectedManifestSha256, "manifest hash")) {
    throw new Error("tag binding manifest bytes differ from the independently supplied hash");
  }
  const manifest = object(JSON.parse(new TextDecoder().decode(args.manifestBytes)), "tag manifest");
  const inputs = object(manifest.inputs, "tag manifest inputs");
  const counts = object(manifest.counts, "tag manifest counts");
  const batch = object(JSON.parse(new TextDecoder().decode(args.batchBytes)), "pilot batch");
  if (
    manifest.schema_version !== "D-private-pilot-tag-binding-manifest-v1" ||
    batch.local_only !== true ||
    batch.production_import_allowed !== false ||
    batch.student_publication_allowed !== false ||
    sha256Hex(args.batchBytes) !== inputs.pilot_batch_sha256 ||
    sha256Hex(args.approvedTaxonomyBytes) !==
      inputs.importer_current_approved39_skill_taxonomy_sha256
  ) {
    throw new Error("pilot batch or approved taxonomy differs from tag manifest");
  }
  if (!Array.isArray(batch.questions) || !Array.isArray(manifest.tag_bindings)) {
    throw new Error("pilot questions or tag bindings are missing");
  }
  const bindings = manifest.tag_bindings as unknown[];
  if (
    batch.questions.length !== inputs.pilot_row_count ||
    batch.questions.length !== counts.verified_domain_topic_cluster_skill_bindings ||
    batch.questions.length !== bindings.length
  ) {
    throw new Error("pilot/tag binding count differs");
  }
  const seen = new Set<string>();
  return batch.questions.map((value, index) => {
    const row = object(value, `pilot row ${index + 1}`);
    const binding = object(bindings[index], `tag binding ${index + 1}`);
    const mapping = object(binding.approved39_mapping, "approved 39 mapping");
    const tags = object(binding.verified_import_tags, "verified import tags");
    const record = object(binding.D_record, "D record");
    const source = object(binding.source_version_ref, "binding source version");
    const answer = object(row.reviewed_answer, "reviewed answer");
    const evidence = object(answer.evidence, "reviewed answer evidence");
    const originalD = object(evidence.D_original_record, "original D record");
    const id = row.stable_question_id;
    if (
      typeof id !== "string" ||
      seen.has(id) ||
      binding.stable_question_id !== id ||
      binding.pilot_row_sha256 !== sha256Hex(canonicalJson(row)) ||
      row.concept_slug != null ||
      evidence.approved_tags != null
    ) {
      throw new Error(`pilot row ${index + 1} identity, bytes, or legacy concept differs`);
    }
    seen.add(id);
    if (
      mapping.selectable !== true ||
      record.uncertain !== false ||
      record.selectable_for_downstream !== true ||
      record.domain !== mapping.D_domain_display_label ||
      record.selectable_skill !== mapping.selectable_skill ||
      originalD.domain !== record.domain ||
      originalD.selectable_skill !== record.selectable_skill ||
      originalD.partial_B_output_version !== binding.B_output_version ||
      source.B_output_version !== binding.B_output_version ||
      source.content_sha256 !== binding.B_question_content_sha256 ||
      source.student_content_sha256 !== binding.B_student_content_sha256 ||
      evidence.B_package_sha256 !== binding.B_question_content_sha256 ||
      evidence.B_student_sha256 !== binding.B_student_content_sha256 ||
      evidence.original_png_sha256 !== binding.B_source_png_sha256 ||
      row.difficulty_content_sha256 !== binding.B_student_content_sha256 ||
      row.domain !== tags.domain
    ) {
      throw new Error(`pilot row ${index + 1} B/D content or tag binding differs`);
    }
    const subject =
      mapping.section === "Math"
        ? "math"
        : mapping.section === "Reading and Writing"
          ? "reading"
          : null;
    const skill = CATALOG_SKILLS.find(
      (candidate) =>
        candidate.subject === subject &&
        candidate.domainLabel === mapping.domain &&
        candidate.label === mapping.selectable_skill
    );
    if (
      !skill ||
      tags.domain !== skill.domainId ||
      tags.topic_cluster !== CLUSTER_BY_DOMAIN[skill.domainId as keyof typeof CLUSTER_BY_DOMAIN]
    ) {
      throw new Error(`pilot row ${index + 1} is not an exact approved catalog binding`);
    }
    const enriched: JsonObject = {
      ...row,
      topic_cluster: tags.topic_cluster,
      reviewed_answer: {
        ...answer,
        evidence: {
          ...evidence,
          approved_tags: {
            schema_version: 1,
            stable_question_id: id,
            catalog_skill_id: skill.id,
            catalog_domain_id: skill.domainId,
            domain_label: skill.domainLabel,
            skill_label: skill.label,
            tag_binding_manifest_sha256: args.expectedManifestSha256,
            pilot_row_sha256: binding.pilot_row_sha256,
            content_sha256: binding.B_question_content_sha256,
            student_content_sha256: binding.B_student_content_sha256,
          },
        },
      },
    };
    verifyApprovedTagRow(enriched);
    return enriched;
  });
}
