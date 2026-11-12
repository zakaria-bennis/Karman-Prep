// The site follows the reader's text size.
//
// - Safari's own page zoom (the "aA" control) and a desktop browser's zoom make the screen narrower in the
//   page's eyes, so the phone layout that already works from 320 px up takes care of them.
// - The iPhone and iPad system setting (Settings, Display, Text Size) does not reach web pages by itself.
//   This script reads it, through the system body font that Safari sizes to match, and lays the page out
//   for a screen that many times narrower. Safari then draws everything that much larger: words, buttons
//   and pictures together, with the layout rearranged the way it is on a smaller phone.
//
// Only larger-than-usual settings are followed, up to LIMIT, and never below a 320 px layout. Other
// browsers do not know the system body font, so the measurement reads as "usual" and nothing changes.
// It runs before the first paint.

/** The system body font's size at the usual setting, in px. */
const USUAL = 17;
/** The most the page grows. */
const LIMIT = 1.3;

export const TEXT_SIZE_BOOT = `(function(){try{var d=document,m=d.querySelector('meta[name="viewport"]');if(!m)return;var p=d.createElement("p");p.style.cssText="font:-apple-system-body;position:absolute;visibility:hidden";d.documentElement.appendChild(p);var k=Math.min(${LIMIT},parseFloat(getComputedStyle(p).fontSize)/${USUAL});p.remove();if(!(k>=1.06))return;var base=m.getAttribute("content")||"";var set=function(){var a=screen.width,b=screen.height,s=matchMedia("(orientation: landscape)").matches?Math.max(a,b):Math.min(a,b),w=Math.max(320,Math.round(s/k));if(!(w<s))return;m.setAttribute("content",base.replace(/width=[^,]+/,"width="+w).replace(/,?\\s*initial-scale=[^,]+/,""))};set();addEventListener("orientationchange",function(){setTimeout(set,60)})}catch(e){}})();`;
