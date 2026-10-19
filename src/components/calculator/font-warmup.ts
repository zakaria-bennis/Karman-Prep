// Math font warm-up for the quiz calculator (AR-41). At prefetch or activation the loader asks
// the document to load the upright and italic faces of the math font stack (--kc-font-math), so
// MathQuill fields measured before the fonts are ready can reflow once they are. The warm-up is never awaited before render, never rejects
// and runs once per page. Eager module: `document` is read only inside the functions (AR-2).

/** The two faces MathQuill renders with (AR-39): upright text and italic variables. */
const CALCULATOR_FONTS = ['16px "Times New Roman"', 'italic 16px "Times New Roman"'] as const;

let warmup: Promise<void> | null = null;
const listeners = new Set<() => void>();
/** The font set the one `loadingdone` listener is attached to, while any subscriber exists. */
let attachedTo: FontFaceSet | null = null;

/** The document's font set, or null outside a browser or where the API is missing. */
function fontFaceSet(): FontFaceSet | null {
  if (typeof document === "undefined") return null;
  const fonts: FontFaceSet | undefined = document.fonts;
  return fonts ?? null;
}

/**
 * Calls every current subscriber. A throwing listener is rethrown in its own microtask, so it
 * neither stops the others nor rejects the warm-up.
 */
function notifyListeners(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  }
}

/** `fonts.load(font)` as a promise, a synchronous throw included. */
function loadFont(fonts: FontFaceSet, font: string): Promise<unknown> {
  try {
    return fonts.load(font);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Loads the upright and italic math faces once per page (AR-41). The returned promise settles after
 * both loads settle and the listeners have run; it never rejects, and without `document.fonts` it
 * resolves at once. Callers never await it before rendering.
 */
export function warmCalculatorFonts(): Promise<void> {
  if (warmup === null) {
    const fonts = fontFaceSet();
    const loads = fonts === null ? [] : CALCULATOR_FONTS.map((font) => loadFont(fonts, font));
    warmup = Promise.allSettled(loads).then(notifyListeners);
  }
  return warmup;
}

/**
 * Calls `listener` when the warm-up resolves and on every `loadingdone` of `document.fonts`
 * (AR-41); the returned function removes it. One `loadingdone` listener serves every subscriber
 * and is removed with the last one.
 */
export function onCalculatorFontsLoaded(listener: () => void): () => void {
  listeners.add(listener);
  if (attachedTo === null) {
    const fonts = fontFaceSet();
    if (fonts !== null) {
      fonts.addEventListener("loadingdone", notifyListeners);
      attachedTo = fonts;
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) detachLoadingDone();
  };
}

function detachLoadingDone(): void {
  attachedTo?.removeEventListener("loadingdone", notifyListeners);
  attachedTo = null;
}

/** A fresh page: forgets the warm-up and every subscriber, and detaches `loadingdone`. */
export function resetFontWarmupForTests(): void {
  warmup = null;
  listeners.clear();
  detachLoadingDone();
}
