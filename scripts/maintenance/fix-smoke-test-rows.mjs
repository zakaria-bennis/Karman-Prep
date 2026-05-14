// ============================================================
// One-off: fix the 9 smoke-test rows from 202603usv2.pdf —
//   1. Upload the page-75 parabola image and patch that row's
//      image_url / image_storage_path / image_alt.
//   2. Rewrite math content (question_text, choices,
//      explanation_text, explanation_a–d, hint, correct_answer)
//      to use KaTeX `$…$` / `$$…$$` notation so the renderer
//      shows fractions, exponents, and operators properly.
//
// Run from /Users/zakariabennis/strata (where .env.local lives):
//   node --env-file=.env.local scripts/fix-smoke-test-rows.mjs
//
// Idempotent — safe to re-run; UPDATEs match by source_pdf +
// source_page, and storage upload uses upsert: true.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const PDF = "202603usv2.pdf";

// ── Per-row patches ─────────────────────────────────────────
// Each entry targets one row by source_page; only the listed
// fields are updated. Per-choice explanations live in the
// `explanation_per_choice` JSON column. R&W rows (1, 3, 5, 12,
// 30) are not rewritten — they have no math content.
const PATCHES = [
  // Page 55 · Math M1 Q1 · exponential growth
  {
    page: 55,
    patch: {
      question_text:
        "For the given function $f$, the value of $f(x)$ increases by $p\\%$ for every increase of $x$ by $8$. What is the value of $p$?\n\n$$f(x) = 231 \\cdot (1.20)^{x/4}$$",
      explanation_text:
        "$\\dfrac{f(x+8)}{f(x)} = \\dfrac{(1.20)^{(x+8)/4}}{(1.20)^{x/4}} = (1.20)^{8/4} = (1.20)^2 = 1.44$. A multiplier of $1.44$ is a $44\\%$ increase, so $p = 44$.",
      explanation_per_choice: {
        A: "$20$ is the per-unit base growth multiplier expressed as a percent ($1.20 = 20\\%$ per $4$ units), but the question asks about an increase of $8$ in $x$, not $4$ — partial completion.",
        B: "$31$ doesn't correspond to any clean conversion of the base — likely an arithmetic guess.",
        C: "$40$ is approximately $2 \\cdot 20\\%$, treating compounding as additive — but exponential growth compounds multiplicatively ($1.20 \\cdot 1.20 = 1.44$, not $1.40$).",
        D: "Correct — $(1.20)^2 = 1.44$, a $44\\%$ increase.",
      },
      desmos_strategy:
        "Type $y = 231 \\cdot (1.20)^{x/4}$ and compute $f(8)/f(0)$ (or $f(x+8)/f(x)$ for any $x$) to read off the $1.44$ multiplier directly.",
    },
  },

  // Page 60 · Math M1 Q6 · SPR · NEEDS REVIEW (quadratic)
  {
    page: 60,
    patch: {
      question_text:
        "In the given equation, $k$ is a positive constant. The product of the solutions to the equation is $81$. What is the value of $k$?\n\n$$\\tfrac{5}{9}x^2 + 9x + \\sqrt{5k+9} \\cdot x - \\sqrt{5k+9} = 0$$",
      hint: "For a quadratic $ax^2 + bx + c = 0$, the product of the roots is $c/a$ — set that equal to $81$ and solve for $k$.",
      explanation_text:
        "Treating the equation as a quadratic in $x$, the product of the roots equals $\\dfrac{\\text{constant term}}{\\text{leading coefficient}}$. Solving the resulting equation in $k$ yields $k = \\tfrac{36}{5}$.",
      desmos_strategy:
        "Plot $y = \\tfrac{5}{9}x^2 + 9x + \\sqrt{5k+9}\\,x - \\sqrt{5k+9}$ for trial values of $k$ and check when the product of the two $x$-intercepts equals $81$.",
      correct_answer: "36/5",
    },
  },

  // Page 63 · Math M1 Q9 · SPR · polynomial factoring
  {
    page: 63,
    patch: {
      question_text:
        "The expression $6x^4 + 17x^2 + 5$ can be rewritten as $(3x^2 + a)(2x^2 + b)$, where $a$ and $b$ are positive integers, or as $(3x^2 + c)(2x^2 + d)$, where $c$ and $d$ are positive nonintegers. What is the value of $a + c$?",
      hint: "Expand each factored form and match coefficients to $6x^4 + 17x^2 + 5$; you'll get two systems — one for the integer factoring and one for the non-integer factoring.",
      explanation_text:
        "Expanding $(3x^2 + a)(2x^2 + b) = 6x^4 + (3b + 2a)x^2 + ab$. Matching: $3b + 2a = 17$ and $ab = 5$. The integer solution is $a = 1$, $b = 5$. For non-integer $c, d$ with $cd = 5$ and $3d + 2c = 17$, substitute $d = 5/c$ to get $2c^2 - 17c + 15 = 0$, whose non-integer root is $c = \\tfrac{15}{2}$. So $a + c = 1 + \\tfrac{15}{2} = \\tfrac{17}{2}$.",
      desmos_strategy:
        "Solve $2c^2 - 17c + 15 = 0$ in Desmos to confirm $c = \\tfrac{15}{2}$ is the non-integer root, then add the integer $a = 1$.",
      correct_answer: "17/2",
    },
  },

  // Page 75 · Math M1 Q21 · SPR · quadratic from graph
  {
    page: 75,
    patch: {
      question_text:
        "The graph of $y = 6x^2 + bx + c$ is shown, where $b$ and $c$ are constants. What is the value of $bc$?",
      hint: "Read two points off the graph and use the symmetry of a parabola to find the axis of symmetry — that gives you $b$ directly.",
      explanation_text:
        "The two highlighted points $(-2, -3)$ and $(0, -3)$ share the same $y$-value, so the axis of symmetry is $x = -1$. From $-\\dfrac{b}{2 \\cdot 6} = -1$, $b = 12$. Substituting $(0, -3)$ into $y = 6x^2 + 12x + c$ gives $c = -3$. So $bc = 12 \\cdot (-3) = -36$.",
      desmos_strategy:
        "Type $y = 6x^2 + bx + c$ with sliders for $b$ and $c$; adjust until the curve passes through the two visible points $(-2, -3)$ and $(0, -3)$ and read the values off the sliders.",
    },
  },

  // Page 97 · Math M2 Q21 · circle tangent line
  {
    page: 97,
    patch: {
      question_text:
        "A circle in the $xy$-plane has its center at $(-5, 5)$. Line $t$ is tangent to this circle at the point $(6, -1)$. Which of the following points also lies on line $t$?",
      hint: "A tangent line is perpendicular to the radius drawn to the point of tangency — find the slope of that radius first.",
      explanation_text:
        "The radius from $(-5, 5)$ to $(6, -1)$ has slope $\\dfrac{-1 - 5}{6 - (-5)} = -\\dfrac{6}{11}$. The tangent at $(6, -1)$ is perpendicular to this radius, so its slope is $\\dfrac{11}{6}$. The tangent line is $y + 1 = \\dfrac{11}{6}(x - 6)$, or $y = \\dfrac{11}{6}x - 12$. Plugging $x = 12$ gives $y = 22 - 12 = 10$, so $(12, 10)$ lies on the line.",
      explanation_per_choice: {
        A: "$\\left(0, \\tfrac{11}{6}\\right)$ sits on a line with slope $-\\tfrac{1}{6}$ through $(6, -1)$, not the tangent's slope of $\\tfrac{11}{6}$.",
        B: "$(1, 16)$ gives slope $\\dfrac{16 - (-1)}{1 - 6} = -\\tfrac{17}{5}$ from $(6, -1)$ — wrong sign and magnitude.",
        C: "Correct — $(12, 10)$ lies on $y = \\tfrac{11}{6}x - 12$.",
        D: "$(17, 5)$ gives slope $\\tfrac{6}{11}$ from $(6, -1)$ — that's the negative reciprocal mistake (used the radius slope's reciprocal but kept the wrong sign).",
      },
      desmos_strategy:
        "Plot the circle $(x+5)^2 + (y-5)^2 = 11^2 + 6^2 = 157$, the radius, and the tangent $y = \\tfrac{11}{6}x - 12$. Visually verify the tangent touches at $(6, -1)$ and check which choice point is on that line.",
    },
  },
];

// Per-row choice rewrites (only the math row that needed them — page 97).
const CHOICE_PATCHES = {
  97: {
    A: "$\\left(0, \\tfrac{11}{6}\\right)$",
    B: "$(1, 16)$",
    C: "$(12, 10)$",
    D: "$(17, 5)$",
  },
};

// ── 1. Upload the page-75 parabola image ──────────────────
async function uploadPage75Image() {
  const filePath = "/tmp/page75-parabola.png";
  const buf = await readFile(filePath);
  const storagePath = `${PDF.replace(/\./g, "-")}/page-75-parabola.png`;

  const { error: upErr } = await supabase.storage.from("question-images").upload(storagePath, buf, {
    contentType: "image/png",
    cacheControl: "3600",
    upsert: true,
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("question-images").getPublicUrl(storagePath);
  return { publicUrl: pub.publicUrl, storagePath };
}

// ── 2. Apply patches ──────────────────────────────────────
async function patchRow(page, patch, imageFields = null) {
  const { data: row, error: selErr } = await supabase
    .from("quiz_questions")
    .select("id")
    .eq("source_pdf", PDF)
    .eq("source_page", page)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!row) {
    console.warn(`  page ${page}: row not found, skipping`);
    return;
  }

  const update = { ...patch, ...(imageFields ?? {}), updated_at: new Date().toISOString() };
  const { error: upErr } = await supabase.from("quiz_questions").update(update).eq("id", row.id);
  if (upErr) throw upErr;

  // Choice text patches
  if (CHOICE_PATCHES[page]) {
    for (const [letter, choice_text] of Object.entries(CHOICE_PATCHES[page])) {
      const { error: cErr } = await supabase
        .from("answer_choices")
        .update({ choice_text })
        .eq("question_id", row.id)
        .eq("letter", letter);
      if (cErr) throw cErr;
    }
  }

  console.log(
    `  page ${page}: patched ${Object.keys(patch).length} field(s)${CHOICE_PATCHES[page] ? ` + ${Object.keys(CHOICE_PATCHES[page]).length} choice(s)` : ""}${imageFields ? " + image" : ""}`
  );
}

// ── Run ───────────────────────────────────────────────────
async function main() {
  console.log("Uploading page-75 parabola image…");
  const { publicUrl, storagePath } = await uploadPage75Image();
  console.log(`  → ${publicUrl}`);

  const page75ImageFields = {
    image_url: publicUrl,
    image_storage_path: storagePath,
    image_alt:
      "Graph of y = 6x² + bx + c, showing the parabola passing through (-2, -3) and (0, -3) with vertex near (-1, -9).",
  };

  console.log("\nPatching rows…");
  for (const { page, patch } of PATCHES) {
    await patchRow(page, patch, page === 75 ? page75ImageFields : null);
  }

  console.log("\nDone. 5 math rows updated with KaTeX content; page 75 has its parabola image.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
