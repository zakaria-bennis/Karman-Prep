// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestion, catalogSkillId } from "../../../../tests/fixtures/approved-catalog";
import CatalogPractice from "./CatalogPractice";

const actions = vi.hoisted(() => ({
  start: vi.fn(),
  resume: vi.fn(),
  submit: vi.fn(),
  complete: vi.fn(),
}));
vi.mock("@/app/learn/catalog-quiz-actions", () => ({
  actionStartCatalogPractice: actions.start,
  actionResumeCatalogPractice: actions.resume,
  actionSubmitCatalogPractice: actions.submit,
  actionCompleteCatalogPractice: actions.complete,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/learn/math",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../Scratchpad", () => ({
  default: ({ pageKey }: { pageKey: string }) => <div data-testid="scratch-key">{pageKey}</div>,
}));
const skill = CATALOG_SKILLS.find((candidate) => candidate.id === catalogSkillId)!;
const questions = ["a", "b"].map((id) =>
  toStudentQuizQuestion({
    ...catalogQuestion(id),
    question_text: `Prompt ${id}`,
  } as unknown as QuizQuestionWithChoices)
);
afterEach(() => {
  for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled();
  vi.clearAllMocks();
});
function expectCurrent(index: number) {
  expect(screen.getByText(questions[index].question_text)).toBeInTheDocument();
  expect(screen.getByTestId("scratch-key")).toHaveTextContent(questions[index].id);
}
it("updates the displayed preview and its scratchpad key together in both directions", () => {
  render(<CatalogPractice skill={skill} initialSession={null} availableQuestions={questions} />);
  expectCurrent(0);
  fireEvent.click(screen.getByRole("button", { name: "Next preview" }));
  expectCurrent(1);
  fireEvent.click(screen.getByRole("button", { name: "Previous preview" }));
  expectCurrent(0);
});
it("keeps the canvas bound to the displayed ID when a refreshed pool shrinks, reorders or empties", () => {
  const view = render(
    <CatalogPractice skill={skill} initialSession={null} availableQuestions={questions} />
  );
  fireEvent.click(screen.getByRole("button", { name: "Next preview" }));
  view.rerender(
    <CatalogPractice skill={skill} initialSession={null} availableQuestions={[questions[0]]} />
  );
  expectCurrent(0);
  view.rerender(
    <CatalogPractice
      skill={skill}
      initialSession={null}
      availableQuestions={[questions[1], questions[0]]}
    />
  );
  expectCurrent(0);
  fireEvent.click(screen.getByRole("button", { name: "Previous preview" }));
  expectCurrent(1);
  view.rerender(<CatalogPractice skill={skill} initialSession={null} availableQuestions={[]} />);
  expect(screen.getByTestId("scratch-key")).toHaveTextContent("empty-preview");
  expect(screen.getByRole("button", { name: "Start practice" })).toBeDisabled();
});
