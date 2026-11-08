// Turns the exported question-bank rows (bank.js) into the shape the demo renders.
// Reading and Writing rows keep their prompt and passage together in question_text, so the
// passage is split out for the passage pane: the paragraph that asks the question is the prompt,
// the rest is the passage.
(function () {
  const SKILL = { craft_structure: 'Craft and Structure', info_ideas: 'Information and Ideas', conventions: 'Standard English Conventions', expression_ideas: 'Expression of Ideas', algebra: 'Algebra', advanced_math: 'Advanced Math', data_analysis: 'Problem-Solving and Data Analysis', geometry: 'Geometry and Trigonometry' };
  const ASKS = /^(which|what|how|according|based on|the student wants)/i;
  function splitReading(text) {
    const paras = text.trim().split(/\n\s*\n/);
    if (paras.length < 2) return { prompt: text, passage: null };
    let k = paras.findIndex((p) => ASKS.test(p.trim()));
    if (k < 0) k = paras.length - 1;
    const before = paras.slice(0, k), after = paras.slice(k + 1);
    // the asking paragraph is the prompt; everything else (before or after it) is the passage
    return { prompt: paras[k], passage: before.concat(after).join('\n\n') || null };
  }
  function figureOf(b) {
    if (b.figure_chart_data) return { type: 'chart', data: b.figure_chart_data, label: b.image_alt };
    if (b.figure_geometry_data) return { type: 'geometry', data: b.figure_geometry_data, label: b.image_alt };
    if (b.figure_table_data) return { type: 'table', data: b.figure_table_data, label: b.image_alt };
    return null;
  }
  window.QUESTIONS = window.BANK.map((b) => {
    const reading = b.subject === 'reading';
    const { prompt, passage } = reading ? splitReading(b.question_text) : { prompt: b.question_text, passage: b.passage || null };
    const key = (b.verified_answer || b.correct_answer || '').trim();
    return {
      id: b.id,
      subject: reading ? 'Reading and Writing' : 'Math',
      skill: SKILL[b.domain] || (b.topic_cluster || '').replace(/&/g, 'and'),
      hard: (b.difficulty_level || 0) >= 5, // internal difficulty 5 to 7 earns 15 points; never shown
      draft: b.publish_status !== 'publish_ready',
      stem: prompt,
      passage,
      figure: figureOf(b),
      numeric: b.answer_format === 'numeric_entry',
      choices: (b.choices || []).map((c) => ({ letter: c.letter, text: c.text, table: c.table })),
      answer: key,
      explain: b.explanation_v2 || b.explanation_text || '',
    };
  });
})();
