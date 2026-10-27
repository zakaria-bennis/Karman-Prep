// Fixture stand-ins for the saved-question server actions.
const saved = new Set<string>();
export async function actionSetBookmark({ questionId, on }: { questionId: string; on: boolean }) {
  if (on) saved.add(questionId);
  else saved.delete(questionId);
  return { saved: on ? "bookmark" : null };
}
export async function actionFlagForTutor({ questionId }: { questionId: string }) {
  saved.add(questionId);
}
export async function actionReportProblem() {}
export async function actionQuizStudentState() {
  return { hasTutor: false, saved: {} };
}
