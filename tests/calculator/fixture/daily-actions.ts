// The daily challenge's server action, replaced in the calculator fixture: no answer is ever sent.
export async function actionReviewDailyAnswer(): Promise<never> {
  throw new Error("The calculator fixture never submits answers.");
}
