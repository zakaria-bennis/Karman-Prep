import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { catalogQuestion } from "../../../tests/fixtures/approved-catalog";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestionPayloadHash } from "./catalog-question-scope";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";

vi.mock("server-only", () => ({}));
const fixture = vi.hoisted(() => ({
  userId: "real-admin" as string | null,
  role: "admin" as string | null,
  question: null as unknown,
  calls: [] as string[],
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => {
    fixture.calls.push("auth");
    return { userId: fixture.userId };
  },
}));
vi.mock("@/lib/supabase/queries/admin", () => ({
  fetchUserRole: async () => {
    fixture.calls.push("role");
    return fixture.role;
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => {
    fixture.calls.push("content");
    const query = {
      select: () => query,
      eq: () => query,
      is: () => query,
      maybeSingle: async () => ({ data: fixture.question, error: null }),
    };
    return { from: () => query };
  },
}));
import { GET } from "@/app/admin/questions/student-view/[id]/figure/[sha256]/route";
import { withPrivateStudentFigure } from "./private-student-figure";
import {
  PRIVATE_Q283_QUESTION_ID,
  PRIVATE_Q283_SOURCE_URL,
  PRIVATE_Q283_SVG,
  PRIVATE_Q283_SVG_SHA256,
} from "./private-q283-svg";

const digest = (s: string) => createHash("sha256").update(s).digest("hex");
function heldQuestion() {
  return {
    ...catalogQuestion(PRIVATE_Q283_QUESTION_ID),
    is_live: false,
    import_status: "needs_review",
    publish_status: "needs_human_review",
    archived_at: null,
    image_url: PRIVATE_Q283_SOURCE_URL,
    figure_kind: "image",
    correct_answer: "secret key",
    explanation_text: "secret explanation",
  } as unknown as QuizQuestionWithChoices;
}
const seal = () => catalogQuestionPayloadHash(heldQuestion());
function get(params: { id?: string; sha256?: string; query?: string } = {}) {
  const id = params.id ?? PRIVATE_Q283_QUESTION_ID;
  const sha256 = params.sha256 ?? PRIVATE_Q283_SVG_SHA256;
  return GET(
    new Request(
      `https://karmanprep.com/admin/questions/student-view/${id}/figure/${sha256}?${params.query ?? `payload_sha256=${seal()}`}`
    ),
    { params: Promise.resolve({ id, sha256 }) }
  );
}
beforeEach(() => {
  fixture.userId = "real-admin";
  fixture.role = "admin";
  fixture.question = heldQuestion();
  fixture.calls = [];
});
describe("protected immutable question figure transport", () => {
  it("returns EXACT reviewed bytes with private headers after authentication and sealed-row checks", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe(PRIVATE_Q283_SVG);
    expect(digest(body)).toBe(PRIVATE_Q283_SVG_SHA256);
    expect(response.headers.get("X-Figure-Sha256")).toBe(digest(body));
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
    expect(response.headers.get("Content-Length")).toBe("11459");
    expect(response.headers.get("Cache-Control")).toContain("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src 'none'");
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(body).not.toContain("secret key");
    expect(body).not.toContain("secret explanation");
    expect(fixture.calls).toEqual(["auth", "role", "content"]);
  });
  it("denies signed-out callers before any database read", async () => {
    fixture.userId = null;
    expect((await get()).status).toBe(404);
    expect(fixture.calls).toEqual(["auth"]);
  });
  it.each(["student", "parent", "tutor", null])(
    "denies %s before question access",
    async (role) => {
      fixture.role = role;
      expect((await get()).status).toBe(404);
      expect(fixture.calls).toEqual(["auth", "role"]);
    }
  );
  it.each([
    { id: "malformed" },
    { sha256: "malformed" },
    { sha256: "a".repeat(64) },
    { query: "payload_sha256=malformed" },
    { query: "" },
    { query: `payload_sha256=${"a".repeat(64)}&payload_sha256=${"b".repeat(64)}` },
  ])("denies malformed, duplicated, missing or unknown bindings: %j", async (params) => {
    const response = await get(params);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("<svg");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it.each([
    { is_live: true },
    { import_status: "ok" },
    { publish_status: "publish_ready" },
    { archived_at: "2026-10-08T00:00:00Z" },
    { correct_answer: "new key" },
    { question_text: "changed content" },
    { image_url: "/other.svg" },
    { image_url: PRIVATE_Q283_SOURCE_URL.replace("8b3a", "7b3a") },
  ])("denies unheld or stale versions on the image request itself: %j", async (change) => {
    fixture.question = { ...heldQuestion(), ...change };
    expect((await get()).status).toBe(404);
  });
  it("denies another held question even with a valid seal and identical asset URL", async () => {
    const id = "3c89d697-c811-5db9-a6b3-f23b520e1433";
    const question = { ...heldQuestion(), id };
    fixture.question = question;
    expect(
      (await get({ id, query: `payload_sha256=${catalogQuestionPayloadHash(question)}` })).status
    ).toBe(404);
  });
  it("maps only the exact Q283 asset, retaining stored seal and recording distinct runtime delivery hash", () => {
    const question = toStudentQuizQuestion(heldQuestion());
    const mapped = withPrivateStudentFigure({ question, payloadSha256: seal() });
    expect(question.image_url).toBe(PRIVATE_Q283_SOURCE_URL);
    expect(mapped.payloadSha256).toBe(seal());
    expect(mapped.transport?.sourceStudentPayloadSha256).not.toBe(
      mapped.transport?.runtimeStudentPayloadSha256
    );
    expect(mapped.question.image_url).toContain(
      `/figure/${PRIVATE_Q283_SVG_SHA256}?payload_sha256=${seal()}`
    );
    expect(JSON.stringify(mapped)).not.toContain("secret key");
    const oldQuestion = { ...question, image_url: "/previous.svg" };
    expect(
      withPrivateStudentFigure({ question: oldQuestion, payloadSha256: seal() }).question
    ).toEqual(oldQuestion);
    expect(() =>
      withPrivateStudentFigure({ question: { ...question, id: "other" }, payloadSha256: seal() })
    ).toThrow("unavailable");
  });
  it("the approved immutable SVG contains no scripts, external resource references or event handlers", () => {
    expect(PRIVATE_Q283_SVG).not.toMatch(
      /<\s*(?:script|foreignObject|iframe|image|use|a|animate|set)\b/i
    );
    expect(PRIVATE_Q283_SVG).not.toMatch(
      /\bon\w+\s*=|\b(?:href|xlink:href)\s*=|@import|url\s*\(|javascript:/i
    );
    const tags = new Set(
      Array.from(PRIVATE_Q283_SVG.matchAll(/<\/?([\w-]+)\b/g), (match) => match[1])
    );
    expect([...tags].sort()).toEqual([
      "circle",
      "desc",
      "g",
      "metadata",
      "path",
      "rect",
      "style",
      "svg",
      "text",
      "title",
    ]);
  });
});
