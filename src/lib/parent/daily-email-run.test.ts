import { describe, expect, it, vi } from "vitest";
import { runDailyParentEmails, type DailyEmailDeps, type DailyEmailLink } from "./daily-email-run";
import {
  dailyEmailMode,
  dailyEmailTimeLabel,
  effectiveDailyEmailTime,
  isDailyEmailTick,
  isDueNow,
} from "./daily-email-schedule";

// 2026-11-13 01:30 UTC is 7:30 PM on Nov 12 in Chicago.
const AT_730_CT = new Date("2026-11-13T01:30:00Z");

function link(id: string, zone: string | null = "America/Chicago"): DailyEmailLink {
  return {
    parentUserId: `parent-${id}`,
    parentEmail: `${id}@example.invalid`,
    parentFirstName: "Fixture",
    parentTimeZone: zone,
    student: { id: `student-${id}`, clerkId: `clerk-${id}`, firstName: "Kid", name: "Kid One" },
  };
}

type D = DailyEmailDeps;

function fakeDeps(over: Partial<D> = {}) {
  const deps = {
    loadLinks: vi.fn<D["loadLinks"]>(async () => [
      link("a"),
      link("b"),
      link("c", "America/New_York"),
    ]),
    loadTimes: vi.fn<D["loadTimes"]>(async () => new Map([["parent-b", null]])),
    hasDailyReport: vi.fn<D["hasDailyReport"]>(async () => true),
    build: vi.fn<D["build"]>(async (l) => ({
      to: l.parentEmail ?? "",
      subject: "s",
      html: "h",
      day: "2026-11-12",
    })),
    claim: vi.fn<D["claim"]>(async () => true),
    send: vi.fn<D["send"]>(async () => {}),
    markSent: vi.fn<D["markSent"]>(async () => {}),
    log: vi.fn<D["log"]>(),
  };
  return { ...deps, ...over } as typeof deps;
}

describe("daily email schedule", () => {
  it("defaults to 7:30 PM, keeps off as off, and labels times", () => {
    expect(effectiveDailyEmailTime(undefined)).toBe("19:30");
    expect(effectiveDailyEmailTime(null)).toBeNull();
    expect(effectiveDailyEmailTime("20:00")).toBe("20:00");
    expect(effectiveDailyEmailTime("03:15")).toBe("19:30");
    expect(dailyEmailTimeLabel("17:00")).toBe("5:00 PM");
    expect(dailyEmailTimeLabel("22:00")).toBe("10:00 PM");
  });

  it("runs on the first tick of each half hour only", () => {
    expect(isDailyEmailTick(new Date("2026-11-13T01:30:40Z"))).toBe(true);
    expect(isDailyEmailTick(new Date("2026-11-13T01:00:00Z"))).toBe(true);
    expect(isDailyEmailTick(new Date("2026-11-13T01:32:00Z"))).toBe(false);
    expect(isDailyEmailTick(new Date("2026-11-13T01:14:00Z"))).toBe(false);
  });

  it("is due in the parent's own zone", () => {
    expect(isDueNow("19:30", AT_730_CT, "America/Chicago")).toBe(true);
    expect(isDueNow("19:30", AT_730_CT, "America/New_York")).toBe(false);
    expect(isDueNow("20:30", AT_730_CT, "America/New_York")).toBe(true);
    expect(isDueNow(null, AT_730_CT, "America/Chicago")).toBe(false);
  });

  it("only sends when DAILY_PARENT_EMAIL is exactly on", () => {
    expect(dailyEmailMode({})).toBe("dry-run");
    expect(dailyEmailMode({ DAILY_PARENT_EMAIL: "" })).toBe("dry-run");
    expect(dailyEmailMode({ DAILY_PARENT_EMAIL: "true" })).toBe("dry-run");
    expect(dailyEmailMode({ DAILY_PARENT_EMAIL: "ON" })).toBe("dry-run");
    expect(dailyEmailMode({ DAILY_PARENT_EMAIL: "on" })).toBe("send");
  });
});

describe("daily email run", () => {
  it("is a dry run by default: builds and counts, never claims or sends", async () => {
    const deps = fakeDeps();
    const result = await runDailyParentEmails(deps, AT_730_CT, {});
    // a is due (default 7:30 PM Chicago); b is off; c is 8:30 PM in New York, not yet.
    expect(result).toEqual({
      mode: "dry-run",
      ran: true,
      due: 1,
      eligible: 1,
      built: 1,
      sent: 0,
      alreadySent: 0,
      failed: 0,
    });
    expect(deps.build).toHaveBeenCalledTimes(1);
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.markSent).not.toHaveBeenCalled();
  });

  it("does nothing between half-hour ticks", async () => {
    const deps = fakeDeps();
    const result = await runDailyParentEmails(deps, new Date("2026-11-13T01:40:00Z"), {
      DAILY_PARENT_EMAIL: "on",
    });
    expect(result.ran).toBe(false);
    expect(deps.loadLinks).not.toHaveBeenCalled();
  });

  it("skips plans without the daily report", async () => {
    const deps = fakeDeps({ hasDailyReport: vi.fn(async () => false) });
    const result = await runDailyParentEmails(deps, AT_730_CT, { DAILY_PARENT_EMAIL: "on" });
    expect(result).toMatchObject({ due: 1, eligible: 0, built: 0, sent: 0 });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("with the flag on, sends once and never twice the same day", async () => {
    const deps = fakeDeps();
    const on = { DAILY_PARENT_EMAIL: "on" };
    expect(await runDailyParentEmails(deps, AT_730_CT, on)).toMatchObject({
      mode: "send",
      sent: 1,
    });
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.markSent).toHaveBeenCalledWith(expect.anything(), "2026-11-12", true);
    deps.claim.mockResolvedValue(false);
    expect(await runDailyParentEmails(deps, AT_730_CT, on)).toMatchObject({
      sent: 0,
      alreadySent: 1,
    });
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("logs counts only, never an address", async () => {
    const deps = fakeDeps();
    await runDailyParentEmails(deps, AT_730_CT, {});
    expect(JSON.stringify(deps.log.mock.calls)).not.toContain("@example.invalid");
  });
});
