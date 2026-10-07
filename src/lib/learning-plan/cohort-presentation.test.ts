import { describe, expect, it } from "vitest";
import {
  cohortPlacementTitle,
  cohortTopicEmptyMessage,
  cohortTopicPresentation,
} from "./cohort-presentation";

describe("cohort presentation", () => {
  it("treats a retained completed-cohort topic as history", () => {
    expect(cohortTopicPresentation("completed", " Linear equations ")).toEqual({
      label: "Last topic",
      topic: "Linear equations",
    });
    expect(cohortPlacementTitle("completed")).toBe("Completed cohort");
  });

  it("labels active and forming topics according to their status", () => {
    expect(cohortTopicPresentation("active", "Functions")?.label).toBe("Current topic");
    expect(cohortTopicPresentation("forming", "Functions")?.label).toBe("Planned topic");
  });

  it("does not turn an absent completed topic into a current one", () => {
    expect(cohortTopicPresentation("completed", null)).toBeNull();
    expect(cohortTopicEmptyMessage("completed")).toBe("No topic recorded");
  });
});
