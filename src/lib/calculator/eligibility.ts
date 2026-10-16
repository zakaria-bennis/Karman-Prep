export function canUseCalculator(
  section: string | null | undefined,
  questionSubject: string | null | undefined,
  active: boolean
): boolean {
  return active && section === "math" && questionSubject === "math";
}
