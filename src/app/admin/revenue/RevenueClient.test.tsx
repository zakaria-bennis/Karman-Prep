// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STILL_ATTR } from "@/lib/painting/motion";
import RevenueClient from "./RevenueClient";
import { fmtMoney } from "./_components/format";
import { buildRevenue } from "./_metrics";
import { sampleInput } from "./_sample";
import type { RevenueData } from "./_types";

const NOW = Date.parse("2026-11-12T18:00:00Z");

function sampleData(): RevenueData {
  return {
    ...buildRevenue(sampleInput(NOW), NOW),
    sample: true,
    sampleReason: "thin",
    realPaidRows: 7,
    sampleThreshold: 12,
  };
}

const snapshot = vi.fn(async () => ({ ok: true as const, mrr: 0 }));

beforeEach(() => {
  // The portal's own "Reduce motion": numbers land at once, so the text can be read.
  document.documentElement.setAttribute(STILL_ATTR, "");
});

describe("RevenueClient", () => {
  it("badges every panel in sample mode and links to the real numbers", () => {
    render(<RevenueClient data={sampleData()} snapshotAction={snapshot} />);
    expect(screen.getByRole("note")).toHaveTextContent("Your database has 7 paid rows");
    expect(screen.getByRole("link", { name: "Show the real numbers" })).toHaveAttribute(
      "href",
      "?sample=0"
    );
    // The headline row plus every chart and list (the "where the numbers come from" note excepted).
    expect(screen.getAllByText("Sample data").length).toBeGreaterThanOrEqual(11);
  });

  it("switches period: headline numbers and charts follow", () => {
    const data = sampleData();
    render(<RevenueClient data={data} snapshotAction={snapshot} />);
    const net30 = data.periods["30d"].kpis.net.value ?? 0;
    const net12 = data.periods["12m"].kpis.net.value ?? 0;
    expect(screen.getByText(`Net revenue: ${fmtMoney(net30)}.`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "12 months" }));
    expect(screen.getByRole("radio", { name: "12 months" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByText(`Net revenue: ${fmtMoney(net12)}.`)).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /^Revenue by plan, last 12 months/ })
    ).toBeInTheDocument();
  });

  it("reads a bar's numbers out when the chart is driven by keyboard", () => {
    const data = sampleData();
    render(<RevenueClient data={data} snapshotAction={snapshot} />);
    const chart = screen.getByRole("group", { name: /^Revenue by plan, last 30 days/ });
    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: "Home" });
    const first = data.periods["30d"].buckets[0];
    expect(
      screen.getByText(
        new RegExp(`^${first.label}: ${fmtMoney(first.net).replace("$", "\\$")} net`)
      )
    ).toBeInTheDocument();
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    const second = data.periods["30d"].buckets[1];
    expect(screen.getByText(new RegExp(`^${second.label}: `))).toBeInTheDocument();
  });

  it("hides a plan from the revenue chart from its legend, never all of them", () => {
    render(<RevenueClient data={sampleData()} snapshotAction={snapshot} />);
    const legend = screen.getByRole("list", { name: "Plans shown" });
    const buttons = within(legend).getAllByRole("button");
    buttons.forEach((b) => fireEvent.click(b));
    const off = buttons.filter((b) => b.getAttribute("aria-pressed") === "false");
    expect(off).toHaveLength(buttons.length - 1);
  });

  it("offers each chart as a table", () => {
    render(<RevenueClient data={sampleData()} snapshotAction={snapshot} />);
    expect(screen.getAllByText("Show as a table")).toHaveLength(3);
    expect(
      screen.getByRole("table", { name: "Revenue by plan, last 30 days" })
    ).toBeInTheDocument();
  });

  it("shows real numbers without any badge", () => {
    const data: RevenueData = {
      ...buildRevenue({ ...sampleInput(NOW), subs: [], purchases: [], refunds: [] }, NOW),
      sample: false,
      sampleReason: null,
      realPaidRows: 0,
      sampleThreshold: 12,
    };
    render(<RevenueClient data={data} snapshotAction={snapshot} />);
    expect(screen.queryByText("Sample data")).toBeNull();
    expect(screen.getByText("MRR: $0.")).toBeInTheDocument();
    expect(screen.getByText("No cohort seats sold yet.")).toBeInTheDocument();
  });
});
