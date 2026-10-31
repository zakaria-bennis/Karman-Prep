import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  role: vi.fn(),
  resume: vi.fn(),
  pool: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mocks.auth }));
vi.mock("@/lib/supabase/queries/admin", () => ({ fetchUserRole: mocks.role }));
vi.mock("../../catalog-quiz-actions", () => ({ actionResumeCatalogPractice: mocks.resume }));
vi.mock("@/components/learn/catalog-practice/CatalogPractice", () => ({ default: () => null }));
vi.mock("../../catalog-actions", () => ({ actionCatalogPracticePool: mocks.pool }));
import Page from "./page";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
const skillId = CATALOG_SKILLS[0].id;
const id = "00000000-0000-4000-8000-000000000003";
function open(query: { session?: string; assignment?: string } = {}, skill = skillId) {
  return Page({
    params: Promise.resolve({ skillId: skill }),
    searchParams: Promise.resolve(query),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: "student-1" });
  mocks.role.mockResolvedValue("student");
  mocks.pool.mockResolvedValue([]);
});
describe("canonical practice route", () => {
  it("renders a fresh entry without calling a mutating or resume action", async () => {
    const result = await open();
    expect(result.props.initialSession).toBeNull();
    expect(mocks.resume).not.toHaveBeenCalled();
    expect(mocks.pool).toHaveBeenCalledWith({ skillId });
    expect(result.props.availableQuestions).toEqual([]);
  });
  it.each([
    [null, "/auth/sign-in"],
    ["parent", "/dashboard/parent"],
    ["tutor", "/tutor"],
    ["unknown", "/onboarding"],
  ])("rejects %s before loading session data", async (role, destination) => {
    if (role === null) mocks.auth.mockResolvedValue({ userId: null });
    else mocks.role.mockResolvedValue(role);
    await expect(open({ session: id })).rejects.toThrow(`redirect:${destination}`);
    expect(mocks.resume).not.toHaveBeenCalled();
    expect(mocks.pool).not.toHaveBeenCalled();
  });
  it("rejects unknown skills, malformed IDs and ambiguous session/assignment requests", async () => {
    await expect(open({}, "legacy-node-id")).rejects.toThrow("not-found");
    await expect(open({ session: "bad" })).rejects.toThrow("not-found");
    await expect(open({ assignment: "bad" })).rejects.toThrow("not-found");
    await expect(open({ session: id, assignment: id })).rejects.toThrow("not-found");
    expect(mocks.resume).not.toHaveBeenCalled();
  });
  it("resumes the exact requested owned session via the guarded action", async () => {
    const session = {
      id,
      skillId,
      question: null,
      reviews: [],
      answered: 1,
      total: 1,
      assignmentId: null,
      completedAt: null,
      score: null,
    };
    mocks.resume.mockResolvedValue(session);
    const result = await open({ session: id });
    expect(mocks.resume).toHaveBeenCalledWith(id);
    expect(result.props.initialSession).toBe(session);
  });
  it("withholds mismatched or unavailable sessions and masks internal errors", async () => {
    mocks.resume.mockResolvedValue({ skillId: "other-skill" });
    const mismatched = await open({ session: id });
    expect(mismatched.props.initialSession).toBeNull();
    expect(mismatched.props.initialError).toContain("changed");
    mocks.resume.mockRejectedValue(new Error("secret-database-info"));
    const unavailable = await open({ session: id });
    expect(unavailable.props.initialSession).toBeNull();
    expect(unavailable.props.initialError).not.toContain("secret");
  });
});

it("withholds private diagnostics when the read-only pool fails", async () => {
  mocks.pool.mockRejectedValue(new Error("private-database-detail"));
  const result = await open();
  expect(result.props.availableQuestions).toEqual([]);
  expect(result.props.initialError).not.toContain("private-database-detail");
  expect(mocks.resume).not.toHaveBeenCalled();
});
it("never substitutes the general pool on an assignment entry", async () => {
  const result = await open({ assignment: id });
  expect(mocks.pool).not.toHaveBeenCalled();
  expect(result.props.availableQuestions).toBeUndefined();
});
