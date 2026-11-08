// Text from the question bank: inline math in \( \) or $ $, display math in \[ \] or $$ $$, and
// light Markdown in explanations (paragraphs, **bold**, bullet lines, > callouts). Math is
// rendered with the locally bundled KaTeX. Emoji in source text are dropped (design rule 7).
(function () {
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2705}\u{2714}]/gu;
  function math(tex, display) {
    try { return window.katex.renderToString(tex, { throwOnError: false, displayMode: display, output: 'html' }); }
    catch { return esc(tex); }
  }
  // pull math out first, escape the rest, then put the rendered math back
  function inline(s) {
    if (s == null) return '';
    const slots = [];
    const keep = (html) => `\u0000${slots.push(html) - 1}\u0000`;
    let t = String(s).replace(EMOJI, '');
    t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => keep(math(m, true)))
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => keep(math(m, true)))
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => keep(math(m, false)))
      .replace(/\$([^$\n]+?)\$/g, (_, m) => keep(math(m, false)));
    t = esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
  }
  function block(s) {
    if (s == null) return '';
    return String(s).trim().split(/\n\s*\n/).map((para) => {
      const lines = para.split('\n');
      if (lines.every((l) => /^\s*([-•*]|\d+\.)\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*([-•*]|\d+\.)\s+/, ''))}</li>`).join('')}</ul>`;
      if (lines.every((l) => /^\s*>/.test(l))) return `<p class="callout">${inline(lines.map((l) => l.replace(/^\s*>\s?/, '')).join(' '))}</p>`;
      if (/^\s*\$\$[\s\S]*\$\$\s*$/.test(para)) return `<div class="mathblock">${inline(para)}</div>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('');
  }
  window.Txt = { inline, block, esc };
})();
