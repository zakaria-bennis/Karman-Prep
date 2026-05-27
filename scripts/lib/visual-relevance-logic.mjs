// ============================================================
// visual-relevance-logic — Phase 4 deterministic visual
// relevance rules.
//
// Goal: separate problem-required visuals from repeated calculator /
// sidebar / background artifacts before the solver/explainer LLMs
// reason from the images.
// ============================================================

export const VISUAL_ASSET_TYPES = new Set([
  "figure_crop",
  "table_crop",
  "chart_crop",
  "graph_crop",
  "calculator_artifact",
  "background_ui_artifact",
]);

export const MIN_REPEAT_COUNT = 3;
export const PHASE4_VERSION = "phase4_visual_relevance_v1";

// Tightened pattern set to avoid false positives on word problems
// where "table" / "graph" / "figure" appear metaphorically:
//   · "the table seats 8 students"     (word problem — no visual)
//   · "the graph of f(x) = 2x + 3"     (algebraic notation — may have no visual)
//   · "figure of speech"               (R&W — no visual)
//
// Strategy: require CONTEXTUAL cues that the noun is being USED as
// a visual reference ("shown", "above", "below", "based on", etc.)
// rather than bare \bword\b matches.
//
// Standalone visualization-only words (histogram, scatter plot, etc.)
// are kept as bare patterns — they're never metaphorical.
const VISUAL_REFERENCE_PATTERNS = [
  // "the X shows/displayed/shown/above/below/illustrates/represents"
  "\\bthe\\s+(graph|table|figure|diagram|chart|plot|scatter\\s*plot|histogram|box\\s*plot|coordinate\\s+plane|number\\s+line)\\s+(above|below|shown|shows|displayed|displays|illustrates|illustrated|represents|indicates|depicts|depicted)\\b",
  // "X above/below" without "the" (e.g. "Graph below shows...")
  "\\b(graph|table|figure|diagram|chart|plot|scatter\\s*plot|histogram|coordinate\\s+plane|number\\s+line)\\s+(above|below)\\b",
  // "based on / according to / using / from the X"
  "\\b(based\\s+on|according\\s+to|using|from)\\s+the\\s+(graph|table|figure|diagram|chart|plot|histogram|scatter\\s*plot|box\\s*plot|coordinate\\s+plane|number\\s+line)\\b",
  // "shown / depicted / illustrated above|below|in" (unambiguous)
  "\\b(shown|depicted|illustrated|graphed|plotted)\\s+(above|below|in)\\b",

  // Standalone visualization-only words (never metaphorical in SAT)
  "\\bscatter\\s*plot\\b",
  "\\bhistogram\\b",
  "\\bbox\\s*plot\\b",
  "\\bline\\s*plot\\b",
  "\\bbar\\s*(graph|chart)\\b",
  "\\bpie\\s*chart\\b",
  "\\bnumber\\s+line\\b",

  // "Fig. 1" / "Fig 2" abbreviation style — always references a visual
  "\\bfig\\.?\\s*\\d+\\b",
];

const VISUAL_REFERENCE_RE = new RegExp(VISUAL_REFERENCE_PATTERNS.join("|"), "i");

export function questionReferencesVisual(question) {
  const text = [
    question?.question_text,
    question?.passage_intro,
    question?.passage,
    question?.passage_a,
    question?.passage_b,
    question?.image_alt,
  ]
    .filter(Boolean)
    .join("\n");
  return VISUAL_REFERENCE_RE.test(text);
}

function normalizeBboxValue(value, pageDimension) {
  if (!Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1000) return value / 1000;
  if (Number.isFinite(pageDimension) && pageDimension > 0) return value / pageDimension;
  return null;
}

export function normalizedBbox(asset) {
  const bbox = asset?.bbox;
  if (!bbox || typeof bbox !== "object") return null;

  const pageWidth = Number(bbox.page_width ?? bbox.width ?? asset?.page_width ?? NaN);
  const pageHeight = Number(bbox.page_height ?? bbox.height ?? asset?.page_height ?? NaN);

  const xMinRaw = Number(bbox.x_min ?? bbox.x ?? bbox.left);
  const yMinRaw = Number(bbox.y_min ?? bbox.y ?? bbox.top);
  const xMaxRaw = Number(
    bbox.x_max ??
      (Number.isFinite(xMinRaw) && Number.isFinite(Number(bbox.width))
        ? xMinRaw + Number(bbox.width)
        : NaN)
  );
  const yMaxRaw = Number(
    bbox.y_max ??
      (Number.isFinite(yMinRaw) && Number.isFinite(Number(bbox.height))
        ? yMinRaw + Number(bbox.height)
        : NaN)
  );

  const xMin = normalizeBboxValue(xMinRaw, pageWidth);
  const yMin = normalizeBboxValue(yMinRaw, pageHeight);
  const xMax = normalizeBboxValue(xMaxRaw, pageWidth);
  const yMax = normalizeBboxValue(yMaxRaw, pageHeight);
  if ([xMin, yMin, xMax, yMax].some((v) => v == null)) return null;
  if (xMax <= xMin || yMax <= yMin) return null;
  return { xMin, yMin, xMax, yMax, width: xMax - xMin, height: yMax - yMin };
}

export function isLikelySidebarArtifact(asset) {
  const box = normalizedBbox(asset);
  if (!box) return false;
  const centerX = box.xMin + box.width / 2;
  const leftRail = centerX < 0.35;
  const tallPanel = box.height > 0.22;
  const narrowish = box.width < 0.45;
  return leftRail && tallPanel && narrowish;
}

export function hammingDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number.parseInt(a[i], 16);
    const y = Number.parseInt(b[i], 16);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return Number.POSITIVE_INFINITY;
    let xor = x ^ y;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export function groupByVisualSignature(assets, maxDistance = 4) {
  const groups = [];
  for (const asset of assets) {
    const signature = asset.visual_signature;
    if (!signature) {
      groups.push({ signature: null, assets: [asset] });
      continue;
    }
    const group = groups.find(
      (candidate) =>
        candidate.signature && hammingDistance(candidate.signature, signature) <= maxDistance
    );
    if (group) {
      group.assets.push(asset);
    } else {
      groups.push({ signature, assets: [asset] });
    }
  }
  return groups;
}

export function classifyVisualAsset({
  asset,
  question,
  repeatCount = 1,
  minRepeatCount = MIN_REPEAT_COUNT,
}) {
  const referencesVisual = questionReferencesVisual(question);
  const repeated = repeatCount >= minRepeatCount;
  const sidebarLike = isLikelySidebarArtifact(asset);

  if (asset.asset_type === "calculator_artifact") {
    return {
      visual_class: "calculator_artifact",
      relevance: "irrelevant",
      use_in_solving: false,
      repeated_across_pages: repeated,
      reason: "asset_type=calculator_artifact",
    };
  }

  if (asset.asset_type === "background_ui_artifact") {
    return {
      visual_class: "background_ui_artifact",
      relevance: "irrelevant",
      use_in_solving: false,
      repeated_across_pages: repeated,
      reason: "asset_type=background_ui_artifact",
    };
  }

  if (!VISUAL_ASSET_TYPES.has(asset.asset_type)) {
    return {
      visual_class: "uncertain_visual",
      relevance: asset.relevance ?? "uncertain",
      use_in_solving: Boolean(asset.use_in_solving),
      repeated_across_pages: repeated,
      reason: `asset_type=${asset.asset_type} not classified by phase4`,
    };
  }

  if (repeated && !referencesVisual && (sidebarLike || repeatCount >= minRepeatCount + 1)) {
    return {
      visual_class: sidebarLike ? "calculator_artifact" : "background_ui_artifact",
      relevance: "irrelevant",
      use_in_solving: false,
      repeated_across_pages: true,
      reason: sidebarLike
        ? "repeated_left_sidebar_visual_not_referenced_by_question"
        : "repeated_visual_not_referenced_by_question",
    };
  }

  if (repeated && referencesVisual) {
    return {
      visual_class: "uncertain_visual",
      relevance: "uncertain",
      use_in_solving: false,
      repeated_across_pages: true,
      reason: "visual_repeats_but_question_references_a_visual",
    };
  }

  if (referencesVisual || question?.image_url) {
    return {
      visual_class: "problem_required_visual",
      relevance: "required",
      use_in_solving: true,
      repeated_across_pages: repeated,
      reason: referencesVisual ? "question_text_references_visual" : "question_has_attached_image",
    };
  }

  return {
    visual_class: "uncertain_visual",
    relevance: "uncertain",
    use_in_solving: false,
    repeated_across_pages: repeated,
    reason: "no_question_visual_reference_found",
  };
}

export function buildPhase4Metadata({
  asset,
  question,
  classification,
  visualSignature,
  repeatCount,
}) {
  const previous = {
    relevance: asset.relevance ?? null,
    repeated_across_pages: asset.repeated_across_pages ?? null,
    use_in_solving: asset.use_in_solving ?? null,
  };
  return {
    version: PHASE4_VERSION,
    classified_at: new Date().toISOString(),
    visual_signature: visualSignature ?? null,
    repeat_count: repeatCount,
    question_references_visual: questionReferencesVisual(question),
    visual_class: classification.visual_class,
    reason: classification.reason,
    previous,
  };
}
