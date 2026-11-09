import { afterAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  approveClaimSchema,
  claimListFilterSchema,
  markBonusPaidSchema,
  payClaimSchema,
  rejectClaimSchema,
  reportFileSchema,
  submitClaimFieldsSchema,
} from "./schemas";
import { assertSafeKey, getPrivateFileStore, resolveDriver, scholarshipReportKey } from "./storage";
import { SCHOLARSHIP_TERMS_SECTION } from "./terms-section";
import { COHORT_SCHOLARSHIP } from "@/lib/marketing/offer";

const ID = "11111111-1111-4111-8111-111111111111";
const SHA = "a".repeat(64);

describe("schemas", () => {
  it("accepts a valid upload form and rejects bad scores and dates", () => {
    expect(
      submitClaimFieldsSchema.safeParse({
        cohortId: ID,
        declaredTotalScore: "1480",
        declaredTestDate: "2026-10-04",
      }).success
    ).toBe(true);
    for (const score of ["1485", "390", "1610", "abc"]) {
      expect(
        submitClaimFieldsSchema.safeParse({
          cohortId: ID,
          declaredTotalScore: score,
          declaredTestDate: "2026-10-04",
        }).success
      ).toBe(false);
    }
    expect(
      submitClaimFieldsSchema.safeParse({
        cohortId: ID,
        declaredTotalScore: 1480,
        declaredTestDate: "2999-01-01",
      }).success
    ).toBe(false);
    expect(
      submitClaimFieldsSchema.safeParse({
        cohortId: "x",
        declaredTotalScore: 1480,
        declaredTestDate: "2026-10-04",
      }).success
    ).toBe(false);
  });

  it("only accepts a non-empty PDF up to 10 MB", () => {
    const pdf = new File([new Uint8Array([37, 80, 68, 70])], "report.pdf", {
      type: "application/pdf",
    });
    expect(reportFileSchema.safeParse(pdf).success).toBe(true);
    expect(reportFileSchema.safeParse(new File([], "empty.pdf")).success).toBe(false);
    expect(
      reportFileSchema.safeParse(new File(["x"], "photo.png", { type: "image/png" })).success
    ).toBe(false);
    expect(reportFileSchema.safeParse("not a file").success).toBe(false);
  });

  it("requires a reason to reject and a pi_ id to pay", () => {
    expect(rejectClaimSchema.safeParse({ claimId: ID, reason: "" }).success).toBe(false);
    expect(rejectClaimSchema.safeParse({ claimId: ID, reason: "Name differs" }).success).toBe(true);
    expect(approveClaimSchema.parse({ claimId: ID }).note).toBe("");
    expect(payClaimSchema.safeParse({ claimId: ID, paymentIntentId: "pi_123" }).success).toBe(true);
    expect(
      payClaimSchema.parse({ claimId: ID, paymentIntentId: "" }).paymentIntentId
    ).toBeUndefined();
    expect(payClaimSchema.safeParse({ claimId: ID, paymentIntentId: "ch_123" }).success).toBe(
      false
    );
  });

  it("records a bank transfer only with a past date and a reference", () => {
    expect(
      markBonusPaidSchema.safeParse({ claimId: ID, paidOn: "2026-11-08", reference: "WIRE-0042" })
        .success
    ).toBe(true);
    expect(
      markBonusPaidSchema.safeParse({ claimId: ID, paidOn: "2999-01-01", reference: "WIRE-0042" })
        .success
    ).toBe(false);
    expect(
      markBonusPaidSchema.safeParse({ claimId: ID, paidOn: "2026-11-08", reference: " " }).success
    ).toBe(false);
  });

  it("falls back to safe list filters", () => {
    expect(claimListFilterSchema.parse({ status: "weird", q: 5 })).toEqual({
      status: "submitted",
      q: "",
    });
  });
});

describe("storage", () => {
  let dir = "";
  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("builds only safe keys", () => {
    expect(scholarshipReportKey(ID, SHA)).toBe(`scholarship/${ID}/${SHA}.pdf`);
    expect(() => assertSafeKey("scholarship/../../etc/passwd")).toThrow();
    expect(() => scholarshipReportKey("../x", SHA)).toThrow();
  });

  it("picks local in development and r2 in production unless told otherwise", () => {
    expect(resolveDriver({ NODE_ENV: "development" })).toBe("local");
    expect(resolveDriver({ NODE_ENV: "production" })).toBe("r2");
    expect(resolveDriver({ NODE_ENV: "production", PRIVATE_UPLOADS_DRIVER: "local" })).toBe(
      "local"
    );
  });

  it("writes, reads and deletes a file with the local driver", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "karman-store-"));
    process.env.LOCAL_UPLOADS_DIR = dir;
    const store = getPrivateFileStore("local");
    const key = scholarshipReportKey(ID, SHA);
    await store.put(key, new Uint8Array([1, 2, 3]), "application/pdf");
    expect(Array.from((await store.get(key)) ?? [])).toEqual([1, 2, 3]);
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
    delete process.env.LOCAL_UPLOADS_DIR;
  });

  it("fails clearly when R2 is switched off", async () => {
    await expect(getPrivateFileStore("r2").get(scholarshipReportKey(ID, SHA))).rejects.toThrow(
      "switched off"
    );
  });
});

describe("terms section", () => {
  it("states the award and its split from offer.ts", () => {
    expect(COHORT_SCHOLARSHIP.amount).toBe(1500);
    expect(COHORT_SCHOLARSHIP.refund + COHORT_SCHOLARSHIP.meritBonus).toBe(1500);
    expect(SCHOLARSHIP_TERMS_SECTION.content).toContain("$1,500");
    expect(SCHOLARSHIP_TERMS_SECTION.list.join(" ")).toContain("PSAT");
    expect(SCHOLARSHIP_TERMS_SECTION.list.join(" ")).toContain("$750 each when two students tie");
    expect(SCHOLARSHIP_TERMS_SECTION.list.join(" ")).toContain("by bank transfer");
  });
});
