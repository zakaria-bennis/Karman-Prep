import { describe, expect, it } from "vitest";
import { ADMIN_NAV, adminTitle } from "./admin-nav";

describe("adminTitle", () => {
  it("names each admin page from its URL, longest match first", () => {
    expect(adminTitle("/admin")).toBe("Admin");
    expect(adminTitle("/admin/scholarship/123")).toBe("Scholarship");
    expect(adminTitle("/admin/questions/preview/rapid")).toBe("Question preview");
    expect(adminTitle("/admin/questions/inspect/9")).toBe("Questions");
    expect(adminTitle("/admin/plans")).toBe("Plans and subscriptions");
  });

  it("keeps the tab bar to six tabs so it fits a phone", () => {
    expect(ADMIN_NAV).toHaveLength(6);
  });
});
