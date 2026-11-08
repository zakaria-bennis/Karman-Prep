import { readFileSync } from "node:fs";

const approved = JSON.parse(
  readFileSync(new URL("../../src/data/curriculum/approved-skill-taxonomy.json", import.meta.url))
);
const domainIds = {
  "Information and Ideas": "info_ideas",
  "Craft and Structure": "craft_structure",
  "Expression of Ideas": "expression_ideas",
  "Standard English Conventions": "conventions",
  Algebra: "algebra",
  "Advanced Math": "advanced_math",
  "Problem-Solving and Data Analysis": "data_analysis",
  "Geometry and Trigonometry": "geometry",
};
const clusters = {
  info_ideas: "Information & Ideas",
  craft_structure: "Craft & Structure",
  expression_ideas: "Expression of Ideas",
  conventions: "Standard English Conventions",
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  data_analysis: "Problem-Solving & Data Analysis",
  geometry: "Geometry & Trigonometry",
};
const hash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const skills = new Map(
  approved.domains.flatMap((domain) =>
    domain.skills
      .filter((skill) => skill.selectable)
      .map((skill) => {
        const subject = domain.section === "Math" ? "math" : "reading";
        const id = `${subject === "math" ? "ma" : "rw"}-skill-${skill.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`;
        return [
          id,
          {
            subject,
            domainId: domainIds[domain.label],
            domainLabel: domain.label,
            label: skill.label,
          },
        ];
      })
  )
);

/** Accept a new question's exact approved catalog identity as its topic locator. */
export function verifiedCatalogTopic(question, rawEvidence) {
  const evidence =
    rawEvidence?.kind === "independently_confirmed_generated" ? rawEvidence.evidence : rawEvidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return false;
  const tags = evidence.approved_tags;
  const d = evidence.D_original_record;
  if (!tags || !d || typeof tags !== "object" || typeof d !== "object") return false;
  const skill = skills.get(tags.catalog_skill_id);
  if (!skill) return false;
  const identity = /^.+_(RW|MATH)_M([12])_Q(\d+)$/.exec(tags.stable_question_id ?? "");
  return (
    Boolean(identity) &&
    question.source_section === (identity[1] === "MATH" ? "math" : "reading") &&
    question.source_module === `M${identity[2]}` &&
    question.source_question_number === Number(identity[3]) &&
    question.source_version === evidence.source_pdf_sha256 &&
    tags.schema_version === 1 &&
    tags.stable_question_id === evidence.question_id &&
    tags.stable_question_id === d.stable_question_id &&
    tags.catalog_domain_id === skill.domainId &&
    tags.domain_label === skill.domainLabel &&
    tags.skill_label === skill.label &&
    question.subject === skill.subject &&
    question.domain === skill.domainId &&
    question.topic_cluster === clusters[skill.domainId] &&
    tags.content_sha256 === evidence.B_package_sha256 &&
    tags.student_content_sha256 === evidence.B_student_sha256 &&
    d.content_sha256 === evidence.B_package_sha256 &&
    d.selectable_skill === skill.label &&
    d.uncertain === false &&
    d.selectable_for_downstream === true &&
    evidence.student_publication_allowed === true &&
    hash(tags.tag_binding_manifest_sha256) &&
    hash(tags.pilot_row_sha256) &&
    hash(tags.content_sha256) &&
    hash(tags.student_content_sha256) &&
    hash(tags.question_payload_sha256)
  );
}
