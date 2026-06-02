TASK: Exhaustively extract EVERY solvable SAT question from this PDF into structured JSON.

SOURCE PDF FILENAME:
{{source_pdf}}

The filename usually follows this pattern:
YYYYMM + region/version information, such as:

- 202406asiav2.pdf
- 202505usv1.pdf
- 202511usv3.pdf
- 202410asiav1.pdf

Use the filename only as source metadata.
Do not infer question content, answers, module structure, page ranges, or region-specific behavior from the filename alone.
The visible PDF content is the source of truth.
Do not alter, normalize, rewrite, or parse the filename inside the question objects.

PRIMARY GOAL:
Turn the PDF into a complete, source-faithful question extraction.

Prioritize extraction fidelity over classification confidence.

You must extract every solvable question from all question-bearing pages. Do not sample, summarize, abridge, or stop early.

EXPECTED STRUCTURE:
A typical SAT PDF has about 98 questions across 4 modules:

- Reading & Writing Module 1: about 27 questions
- Reading & Writing Module 2: about 27 questions
- Math Module 1: about 22 questions
- Math Module 2: about 22 questions

Expected totals:

- Total questions: usually around 98
- Reading & Writing: usually around 54
- Math: usually around 44

IMPORTANT:
These expected counts are validation signals, not permission to invent rows.

If the extracted count is lower than expected:

1. Re-scan all question-bearing pages.
2. Re-check continuation pages.
3. Re-check Math modules and numeric-entry questions.
4. Re-check pages immediately before the answer key.
5. If the source truly contains fewer questions than expected, do NOT fabricate questions. A deterministic validator runs after you and will flag the low count for human review — that is the correct outcome, not invented rows.

QUESTION NUMBERING:

- question_number is the question's number WITHIN ITS MODULE, exactly as printed in the PDF. It RESTARTS at 1 at the start of every module:
  - Reading & Writing Module 1: 1 to about 27
  - Reading & Writing Module 2: 1 to about 27 (restarts at 1 — do NOT continue from Module 1)
  - Math Module 1: 1 to about 22
  - Math Module 2: 1 to about 22 (restarts at 1)
- question_number must equal question_number_visible (the same number printed next to the question, written as a string). They always match.
- Do NOT use a running or global count across modules for question_number.
- extraction_order is the ONLY field that counts continuously across the whole PDF: 1, 2, 3, … in extraction order, spanning all modules.

OUTPUT CONTRACT:
Return ONLY one top-level JSON object of exactly this shape:
{ "questions": [ ... ] }

Do not emit extraction_summary, page_coverage, metadata, or any other top-level key.
Do not include prose, Markdown, comments, or text outside the JSON object.

NOTE ON THE EXAMPLE BELOW:
It shows the field SHAPE only. Emit REAL values for every question — never the literal placeholder strings, zero integers, or empty strings shown in the template. The enum fields (domain, topic_cluster, concept_slug, question_format, answer_source, import_status) MUST use the canonical values from the system instructions. There is no automatic schema enforcement, so a post-extraction validator checks these and flags any invalid value as needs_review — use the canonical values directly.

{
"questions": [
{
"extraction_order": 1,
"section": "reading_writing",
"module_number": 1,
"question_number": 1,
"question_number_visible": "1",
"question_text": "<exact question stem from the PDF>",
"choice_a": "<choice A text from the PDF>",
"choice_b": "<choice B text from the PDF>",
"choice_c": "<choice C text from the PDF>",
"choice_d": "<choice D text from the PDF>",
"correct_answer": "B",
"difficulty": 4,
"topic_cluster": "<one of the canonical topic_cluster values>",
"passage": "<R&W passage body, blank for math>",
"passage_intro": "",
"passage_a": "",
"passage_b": "",
"question_format": "multiple_choice",
"numeric_tolerance": "",
"domain": "<one of: algebra | advanced_math | geometry | data_analysis | info_ideas | craft_structure | expression_ideas | conventions>",
"concept_slug": "<one of the 89 canonical concept_slug values>",
"answer_source": "extracted",
"source_page": 1,
"has_figure": false,
"figure_alt": "",
"import_status": "ok",
"import_flag_reason": ""
}
]
}

INTERNAL WORKFLOW:
Before emitting final JSON, process the PDF in this order:

1. Identify question-bearing page ranges.
2. Identify answer-key pages at the end of the PDF.
3. Identify the four modules if visible:
   - Reading & Writing Module 1
   - Reading & Writing Module 2
   - Math Module 1
   - Math Module 2
4. Count visible question numbers per module.
5. Extract every question in page order.
6. Merge continuation-page questions when a question spans two pages.
7. Read the answer-key pages.
8. Attach correct_answer to each question.
9. Self-check page coverage and module counts.
10. Emit JSON only.

DO NOT STOP EARLY:

- This is not a sample extraction task.
- Process all question-bearing pages in order.
- Skip only non-question instruction pages and answer-key pages.
- Do not skip a page because its top section looks repeated.
- Use concise field values.
- Do not generate explanations, hints, or solution steps.

EXTRACTION SCOPE:
For each question, extract exactly these fields:

- extraction_order
- section
- module_number
- question_number
- question_number_visible
- question_text
- choice_a, choice_b, choice_c, choice_d for multiple choice
- correct_answer
- difficulty, from 1 to 7
- topic_cluster
- passage, passage_intro, passage_a, passage_b for Reading & Writing
- question_format
- numeric_tolerance
- domain
- concept_slug
- answer_source
- source_page
- has_figure
- figure_alt
- import_status
- import_flag_reason

Do NOT extract or generate (downstream stages own these):

- explanation_text
- explanation_a, explanation_b, explanation_c, explanation_d
- hint
- desmos_strategy
- image_url
- image_alt
- content_hash

GENERAL EXTRACTION RULES:

- Extract the visible text faithfully.
- Preserve mathematical meaning.
- Use KaTeX/LaTeX notation for math when needed, such as $x^2$, $\frac{1}{2}$, $\sqrt{x}$.
- Do not drop numeric-entry Math questions because they lack A-D choices.
- For numeric-entry Math questions, set question_format = "numeric_entry" and leave choices empty.
- For multiple-choice questions, fill all four choices A-D.
- If a multiple-choice question is missing one or more choices because of a continuation page, inspect the next page before deciding it is incomplete.
- If source text is unclear, extract the best visible version and set import_status = "needs_review" with a specific import_flag_reason.
- Never silently skip a questionable item.

READING & WRITING STRUCTURE:
Separate the stimulus/passage from the question stem.

For Reading & Writing:

- passage contains the stimulus text used to answer the question.
- passage may be a normal passage, bullet list, student notes, quotation, or other stimulus text.
- question_text contains only the actual question stem.
- Do not duplicate the passage in both passage and question_text.
- Do not leave passage empty for ordinary single-passage Reading & Writing questions.

R&W question_text should normally begin with one of these SAT stem starters:

- "As used in the text"
- "Based on the text"
- "Based on the texts"
- "Which"
- "What"
- "How"
- "According"
- "The student"

If the visible R&W stem does not begin with one of these starters:

- Preserve the visible stem.
- Do not rewrite source text just to force a canonical starter.
- Set import_status = "needs_review".
- Set import_flag_reason = "noncanonical_rw_stem_start".

COMMON R&W MISTAKES TO AVOID:

WRONG:
question_text = "The Apollo Moon landings (1969-1972) left charged particle detectors and equipment too heavy for liftoff on the Moon and produced large amounts of data. Researcher Philip Metzger continues to use Apollo's data, demonstrating that the missions' value to science **\_\_**. Which choice completes the text with the most logical and precise word or phrase?"

RIGHT:
passage = "The Apollo Moon landings (1969-1972) left charged particle detectors and equipment too heavy for liftoff on the Moon and produced large amounts of data. Researcher Philip Metzger continues to use Apollo's data, demonstrating that the missions' value to science **\_\_**."
question_text = "Which choice completes the text with the most logical and precise word or phrase?"

WRONG:
question_text = "Assuming P4 gave equal ratings to impressionist and cubist paintings, the graph reveals that the model predicted \_\_\_\_. Which choice most effectively uses data from the graph to complete the statement?"

RIGHT:
passage = "Assuming P4 gave equal ratings to impressionist and cubist paintings, the graph reveals that the model predicted \_\_\_\_."
question_text = "Which choice most effectively uses data from the graph to complete the statement?"

CROSS-TEXT READING & WRITING:
If the question shows Text 1 and Text 2:

- passage = ""
- passage_a = Text 1 body
- passage_b = Text 2 body
- passage_intro = any shared intro before Text 1/Text 2, if visible
- question_text = the question stem only

MATH STRUCTURE:
For Math questions:

- passage = ""
- passage_intro = ""
- passage_a = ""
- passage_b = ""
- section = "math"
- module_number = 1 or 2 if visible or inferable from page/module order
- question_format = "multiple_choice" or "numeric_entry"

For Math numeric-entry questions:

- choice_a = ""
- choice_b = ""
- choice_c = ""
- choice_d = ""
- correct_answer = the numeric/expression answer from the answer key
- numeric_tolerance = use a reasonable tolerance only if the answer key or question implies rounding/tolerance; otherwise leave empty

FIGURE DETECTION:
For every question, set has_figure.

Set has_figure = true if the question's meaning depends on a real visual element visible in the PDF, including:

- graph
- scatterplot
- bar chart
- line chart
- pie chart
- histogram
- boxplot
- geometry diagram
- coordinate plane
- table of values
- function plot
- regular polygon
- circle diagram
- chart/table embedded in a Reading & Writing passage
- any stem that says "the figure shown", "based on the graph", "the table above", "shown in the diagram", or similar

Set has_figure = false if the question is solvable from text alone.

Do NOT mark has_figure = true for irrelevant calculator/sidebar artifacts unless the question explicitly depends on them.

If unsure whether a visual is required:

- set has_figure = true
- write a cautious figure_alt
- set import_status = "needs_review"
- set import_flag_reason = "uncertain_required_visual"

When has_figure = true:

- figure_alt must be a 1-2 sentence description of the relevant visual.
- Do not describe irrelevant calculator sidebars unless they are clearly part of the question.
- Visual crop/render validation happens in a downstream stage; here has_figure is a first-pass signal only.

CONTINUATION PAGES:
Some SAT questions span two pages because the figure and choices do not fit on one page.

Common pattern:

- Page N: question stem + figure + choices A, B, C
- Page N+1: same figure or repeated top section + choices B, C, D
- Page N+1 may also contain new unrelated questions below the repeated section

When you see this:

1. Merge the choices across both pages into ONE question.
2. source_page = the earlier page N.
3. Fill all four choices A-D.
4. Continue scanning page N+1 below the repeated section.
5. Extract every new question on page N+1 separately with source_page = N+1.
6. Do not skip page N+1 just because the top looks duplicated.

If a continuation merge is uncertain, set import_status = "needs_review" and note the merge in import_flag_reason. Otherwise keep the row clean.

ANSWERS:
The correct answer comes from the official ANSWER KEY, which is a list/table at the END of the PDF — typically one section per module, e.g. a page titled "Math Module 2 Answers" with entries like "1. 14", "2. D", "3. A", ...

- READ correct_answer from that answer key, matching by module + question number, and set answer_source = "extracted". The key covers BOTH multiple-choice (a letter A-D) and student-produced-response Math (a number, e.g. 14, -5, 27, 64).
- A highlighted, filled-in, selected, or circled choice ON A QUESTION PAGE is NOT the answer — on attempt-style PDFs it is the student's own (often wrong, often blank) selection. NEVER copy it.
- Only if the PDF has NO answer key at all: SOLVE the question yourself and set answer_source = "inferred".
- For numeric-entry Math, take the key's numeric value; never use a value typed into the on-page answer box.
- If a key entry is missing or unreadable for a question, set import_status = "needs_review" with import_flag_reason = "answer_uncertain".

Do not silently guess.

DOMAIN AND TOPIC RULES:
Use only the canonical taxonomy values from the system instructions for:

- domain
- topic_cluster
- concept_slug

topic_cluster:

- topic_cluster is the BROAD category that pairs 1:1 with domain — exactly one of the 8 cluster names in the system instructions (e.g. "Information & Ideas", "Algebra").
- It is NOT a fine-grained skill name. Do NOT emit labels like "Vocabulary in Context", "Main Idea", "Transitions", "Grammar", or "Function".
- The correct topic_cluster is fully determined by domain; pick the cluster that matches the domain you chose.

domain and section must agree:

- section = "reading_writing" → domain is one of: info_ideas, craft_structure, expression_ideas, conventions.
- section = "math" → domain is one of: algebra, advanced_math, geometry, data_analysis.
- data_analysis is a MATH domain. A Reading & Writing question that uses a table, graph, or data to support a claim ("command of evidence") is STILL Reading & Writing — use info_ideas, NOT data_analysis.

And use only these fixed enum values:

- question_format: "multiple_choice" | "numeric_entry"
- answer_source: "extracted" | "inferred" | "hand_corrected"
- import_status: "ok" | "needs_review"

concept_slug:

- Pick exactly one concept_slug from the 89-slug taxonomy in the system instructions.
- The slug must match one of the 89 exactly.
- If uncertain, choose the best available slug but set import_status = "needs_review" and explain uncertainty in import_flag_reason.
- Do not let slug uncertainty cause you to drop the question.

difficulty:

- Use 1-7.
- If uncertain, choose a reasonable estimate.
- Do not spend excessive effort on difficulty. Extraction fidelity is more important.

SELF-CHECK BEFORE EMITTING:
Verify:

1. Did you process every question-bearing page?
2. Did you skip only answer-key/non-question pages?
3. Did you extract all visible questions on each page?
4. Did you handle continuation pages?
5. Did you include Math questions?
6. Did you include numeric-entry questions?
7. Did you attach answers from the answer key?
8. Did you avoid duplicating R&W passages inside question_text?

Expected count checks (re-scan, do not fabricate):

- If total questions < 95, re-scan all question-bearing pages.
- If math count < 42, specifically re-check Math modules and continuation pages.
- If R&W count < 52, specifically re-check Reading & Writing modules.
- If numeric-entry count = 0, re-check Math modules.

If the source genuinely contains fewer questions than expected, do not invent rows. The downstream validator will flag the gap for human review.

IMPORT STATUS:
Use import_status = "ok" when the question is cleanly extracted.

Use import_status = "needs_review" when:

- text is unclear
- answer key is unclear
- manual correction is unclear
- figure requirement is uncertain
- R&W stem starter is noncanonical
- continuation page merge is uncertain
- source_page is uncertain
- question appears incomplete
- concept_slug is uncertain
- choices are incomplete
- numeric answer is unclear

import_flag_reason must be specific and concise.

FINAL OUTPUT:
Return only the JSON object:
{ "questions": [ ... ] }

No prose, no Markdown, no other top-level keys, nothing outside the JSON object.
