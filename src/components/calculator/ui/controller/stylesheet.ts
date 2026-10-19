// Applies CALCULATOR_CSS to a shadow root (AR-36): one constructed base sheet per Document,
// shared by every calculator, plus a per-instance skin sheet adopted last. Without constructable
// sheets, `<style data-kc-base>` and `<style data-kc-skin>` elements are appended instead.

export interface ShadowStyles {
  setSkinCss(css: string): void;
  dispose(): void;
}

const baseSheets = new WeakMap<Document, Map<string, CSSStyleSheet>>();

function canAdopt(shadow: ShadowRoot): boolean {
  return (
    typeof globalThis.CSSStyleSheet?.prototype?.replaceSync === "function" &&
    "adoptedStyleSheets" in shadow
  );
}

function baseSheet(doc: Document, css: string): CSSStyleSheet {
  let byCss = baseSheets.get(doc);
  if (!byCss) baseSheets.set(doc, (byCss = new Map()));
  let sheet = byCss.get(css);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    byCss.set(css, sheet);
  }
  return sheet;
}

export function installStyles(shadow: ShadowRoot, css: string): ShadowStyles {
  const doc = shadow.ownerDocument;
  if (canAdopt(shadow)) {
    const base = baseSheet(doc, css);
    const skin = new CSSStyleSheet();
    shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, base, skin];
    return {
      setSkinCss: (text) => skin.replaceSync(text),
      dispose: () => {
        shadow.adoptedStyleSheets = shadow.adoptedStyleSheets.filter(
          (sheet) => sheet !== base && sheet !== skin
        );
      },
    };
  }
  const base = doc.createElement("style");
  base.setAttribute("data-kc-base", "");
  base.textContent = css;
  const skin = doc.createElement("style");
  skin.setAttribute("data-kc-skin", "");
  shadow.append(base, skin);
  return {
    setSkinCss: (text) => {
      skin.textContent = text;
    },
    dispose: () => {
      base.remove();
      skin.remove();
    },
  };
}
