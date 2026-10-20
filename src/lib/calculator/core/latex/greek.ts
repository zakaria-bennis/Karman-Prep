// The letter MathQuill shows for each Greek command (PR-11). Pure TypeScript: no DOM.

/** The letters MathQuill shows for each Greek command (PR-11; omicron is not a name). */
export const GREEK_LETTERS: Readonly<Record<string, string>> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ϵ",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  varrho: "ϱ",
  sigma: "σ",
  varsigma: "ς",
  tau: "τ",
  upsilon: "υ",
  phi: "ϕ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
};

/** The letter of a Greek command name without its backslash (`alpha` → α), else the name. */
export function displayGreek(name: string): string {
  return GREEK_LETTERS[name] ?? name;
}
