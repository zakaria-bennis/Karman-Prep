// Fixture stand-ins for the saved-question server actions.
const saved = new Set<string>();
export async function actionToggleBookmark({ questionId }: { questionId: string }) {
  if (saved.has(questionId)) saved.delete(questionId);
  else saved.add(questionId);
  return { saved: saved.has(questionId) };
}
export async function actionFlagForTutor({ questionId }: { questionId: string }) {
  saved.add(questionId);
}
export async function actionReportProblem() {}
export async function actionQuizStudentState() {
  return { hasTutor: false, saved: {} };
}
