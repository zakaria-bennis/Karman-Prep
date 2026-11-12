import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import AdminWaiting from "./AdminWaiting";

it("splits what waits on an admin into its three queues, from the counts the home page reads", () => {
  const html = renderToStaticMarkup(<AdminWaiting messages={3} claims={1} flags={6} />);
  expect(html).toContain("What is waiting on you");
  expect(html).toContain("10 in all");
  expect(html).toContain(
    "Family messages 3 (30%), Scholarship claims 1 (10%), Flagged imports 6 (60%)"
  );
});

it("says when nothing waits, and when a count could not be read", () => {
  expect(renderToStaticMarkup(<AdminWaiting messages={0} claims={0} flags={0} />)).toContain(
    "Nothing is waiting on you."
  );
  const html = renderToStaticMarkup(<AdminWaiting messages={2} claims={null} flags={0} />);
  expect(html).toContain("1 count could not be read");
  expect(html).not.toContain("Scholarship claims");
});
