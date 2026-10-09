// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogStudentSession } from "@/lib/catalog-practice/student-entry";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestion, catalogSkillId } from "../../../../tests/fixtures/approved-catalog";
import CatalogPractice from "./CatalogPractice";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  resume: vi.fn(),
  submit: vi.fn(),
  complete: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@/app/learn/catalog-quiz-actions", () => ({
  actionStartCatalogPractice: mocks.start,
  actionResumeCatalogPractice: mocks.resume,
  actionSubmitCatalogPractice: mocks.submit,
  actionCompleteCatalogPractice: mocks.complete,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
const id = "00000000-0000-4000-8000-000000000003";
const questionId = "00000000-0000-4000-8000-000000000001";
const skill = CATALOG_SKILLS.find((candidate) => candidate.id === catalogSkillId)!;
const question = toStudentQuizQuestion(
  catalogQuestion(questionId) as unknown as QuizQuestionWithChoices
);
const review = {
  questionId,
  isCorrect: true,
  studentAnswer: "A",
  correct_answer: "A",
  numeric_tolerance: null,
  explanation_text: "Saved explanation only.",
  explanation_per_choice: null,
  desmos_strategy: null,
};
function session(overrides: Partial<CatalogStudentSession> = {}): CatalogStudentSession {
  return {
    id,
    skillId: skill.id,
    assignmentId: null,
    completedAt: null,
    score: null,
    answered: 0,
    total: 1,
    question,
    reviews: [],
    ...overrides,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.start.mockResolvedValue(session());
  mocks.resume.mockResolvedValue(session({ answered: 1, question: null, reviews: [review] }));
  mocks.submit.mockResolvedValue(review);
  mocks.complete.mockResolvedValue(
    session({
      answered: 1,
      question: null,
      reviews: [review],
      score: 100,
      completedAt: "2026-10-08T00:00:00Z",
    })
  );
});
function mount(initialSession: CatalogStudentSession | null = null, props = {}) {
  return render(<CatalogPractice skill={skill} initialSession={initialSession} {...props} />);
}

describe("canonical student practice", () => {
  it("allocates only after explicit start and pins the returned owned session in the URL", async () => {
    mount();
    expect(mocks.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await screen.findByText(question.question_text);
    expect(mocks.start).toHaveBeenCalledWith({ skillId: skill.id, assignmentId: undefined });
    expect(mocks.replace).toHaveBeenCalledWith(`/learn/practice/${skill.id}?session=${id}`, {
      scroll: false,
    });
    expect(screen.queryByText(/Correct answer:/)).toBeNull();
    expect(screen.queryByText("Saved explanation only.")).toBeNull();
  });
  it("does not double-submit; waits for saved feedback, then finishes the actual session", async () => {
    let save!: (value: typeof review) => void;
    mocks.submit.mockReturnValue(
      new Promise((resolve) => {
        save = resolve;
      })
    );
    mount(session());
    fireEvent.click(screen.getByRole("radio", { name: "Choice A" }));
    const form = screen.getByRole("button", { name: "Check answer" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Correct answer:/)).toBeNull();
    await act(async () => save(review));
    expect(screen.getByText("Correct · answer saved")).toBeTruthy();
    expect(screen.getByText("Saved explanation only.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "See results" }));
    await screen.findByText("Practice complete");
    expect(mocks.resume).toHaveBeenCalledWith(id);
    expect(mocks.complete).toHaveBeenCalledWith(id);
    expect(screen.getByText(/This practice only/)).toBeTruthy();
    expect(screen.getByText(/does not establish mastery/)).toBeTruthy();
  });
  it("retains the selected answer on a failed save and accepts the server's original saved response on retry", async () => {
    mocks.submit
      .mockRejectedValueOnce(new Error("internal-db-secret-detail"))
      .mockResolvedValueOnce({ ...review, studentAnswer: "B", isCorrect: false });
    mount(session());
    fireEvent.click(screen.getByRole("radio", { name: "Choice A" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("radio", { name: "Choice A" })).toBeChecked();
    expect(screen.queryByText(/internal-db/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await screen.findByText("Incorrect · answer saved");
    expect(screen.getByText(/Your saved answer:/).textContent).toContain("B");
  });
  it("resumes without allocation and completes a session whose final answer was already saved", async () => {
    mount(session({ answered: 1, question: null, reviews: [review] }));
    expect(screen.getByText("All 1 answers are saved")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "See results" }));
    await screen.findByText("Practice complete");
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("advances to the server's next question without starting or grading locally", async () => {
    const nextQuestion = {
      ...question,
      id: "00000000-0000-4000-8000-000000000002",
      question_text: "Second reviewed question",
    };
    mocks.resume.mockResolvedValue(
      session({ answered: 1, total: 2, question: nextQuestion, reviews: [review] })
    );
    mount(session({ total: 2 }));
    fireEvent.click(screen.getByRole("radio", { name: "Choice A" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await screen.findByText("Correct · answer saved");
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    await screen.findByText("Second reviewed question");
    expect(screen.queryByText(/Correct answer:/)).toBeNull();
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("keeps saved feedback when completion fails and allows a safe retry", async () => {
    mocks.complete
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(
        session({ completedAt: "done", question: null, answered: 1, score: 100, reviews: [review] })
      );
    mount(session());
    fireEvent.click(screen.getByRole("radio", { name: "Choice A" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await screen.findByText("Correct · answer saved");
    fireEvent.click(screen.getByRole("button", { name: "See results" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Correct · answer saved")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "See results" }));
    await screen.findByText("Practice complete");
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });
  it("holds changed versions or empty pools and never silently substitutes legacy practice", async () => {
    mocks.start.mockRejectedValue(new Error("No distinct approved questions are available"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await screen.findByText(/Reviewed questions are not available/);
    expect(mocks.replace).not.toHaveBeenCalled();
    mocks.start.mockResolvedValue(session({ skillId: "other-skill" }));
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await screen.findByText(/These questions have changed/);
    expect(screen.queryByText(question.question_text)).toBeNull();
  });
  it("passes assignment identity to the existing guarded start action", async () => {
    mount(null, { assignmentId: id });
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await waitFor(() =>
      expect(mocks.start).toHaveBeenCalledWith({ skillId: skill.id, assignmentId: id })
    );
  });
  it("retries an unavailable URL session without allocating a replacement", async () => {
    mount(null, { resumeSessionId: id, initialError: "Session unavailable" });
    fireEvent.click(screen.getByRole("button", { name: "Retry loading practice" }));
    await screen.findByText("All 1 answers are saved");
    expect(mocks.resume).toHaveBeenCalledWith(id);
    expect(mocks.start).not.toHaveBeenCalled();
  });
});

it("does not number an active randomized session", () => {
  mount(session({ answered: 1, total: 11 }));
  expect(screen.queryByText(/Question 2 of 11|2\/11/)).toBeNull();
  expect(screen.getByText("Skill practice")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Scratchpad" })).toBeTruthy();
});
