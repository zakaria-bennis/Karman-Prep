// The key a quiz host gives CalculatorScope for one question (AR-58): the session id and the
// question id joined by ":". The scope remounts, and so starts a fresh calculator, whenever it
// changes. Eager module: no browser global at module scope (AR-2).

/** `${sessionId}:${questionId}`. */
export function makeQuestionKey(sessionId: string, questionId: string): string {
  return `${sessionId}:${questionId}`;
}

/**
 * The question id of a key made by `makeQuestionKey`: the text after the first ":", so a question
 * id that itself holds ":" comes back whole. A key without ":" is returned whole.
 */
export function questionIdFromKey(questionKey: string): string {
  const colon = questionKey.indexOf(":");
  return colon === -1 ? questionKey : questionKey.slice(colon + 1);
}
