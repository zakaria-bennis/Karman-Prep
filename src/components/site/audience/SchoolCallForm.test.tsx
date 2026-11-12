// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("@/app/(site)/schools/school-call-actions", () => ({ submitSchoolCall: send }));
vi.mock("../live/kit", () => ({ busy: vi.fn(), toast: vi.fn() }));

import SchoolCallForm from "./SchoolCallForm";

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;
const next = () => screen.getByRole("button", { name: /next: how to reach you/i });

function fillStepOne() {
  fireEvent.change(field(/school name/i), { target: { value: "Lakeview High" } });
  fireEvent.change(field(/your role/i), { target: { value: "Counselor" } });
  fireEvent.change(field(/number of students/i), { target: { value: "250 to 500" } });
  fireEvent.click(screen.getByLabelText("Next school year"));
}

beforeEach(() => {
  send.mockReset();
  render(<SchoolCallForm heading="Book a call" text="Two short steps." proof={["65 districts"]} />);
});

describe("SchoolCallForm", () => {
  it("opens on step 1 of 2, with the proof beside it", () => {
    expect(screen.getByText(/Step 1 of 2/)).toBeTruthy();
    expect(screen.getByText("65 districts")).toBeTruthy();
    expect(field(/work email/i).closest("fieldset")?.hidden).toBe(true);
  });

  it("checks a field when you leave it, and clears the message once it's fixed", () => {
    fireEvent.change(field(/school name/i), { target: { value: "x".repeat(121) } });
    fireEvent.blur(field(/school name/i));
    expect(field(/school name/i).getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(field(/school name/i), { target: { value: "Lakeview" } });
    expect(field(/school name/i).getAttribute("aria-invalid")).toBeNull();
  });

  it("never blocks the button: Next shows what's missing and stays on step 1", () => {
    fireEvent.click(next());
    expect(screen.getByText(/Add your school's name/)).toBeTruthy();
    expect(screen.getByText(/Pick when you'd like to start/)).toBeTruthy();
    expect(document.activeElement).toBe(field(/school name/i));
  });

  it("goes to step 2, keeps step 1's answers, and sends both", async () => {
    send.mockResolvedValue({ ok: true });
    fillStepOne();
    fireEvent.click(next());
    expect(screen.getByText(/Step 2 of 2/)).toBeTruthy();
    expect(document.activeElement).toBe(field(/your name/i));
    fireEvent.change(field(/your name/i), { target: { value: "Dana Reyes" } });
    fireEvent.change(field(/work email/i), { target: { value: "dana@lakeview.org" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /book the call/i }));
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        school: "Lakeview High",
        role: "Counselor",
        start: "Next school year",
        name: "Dana Reyes",
        email: "dana@lakeview.org",
        phone: "",
        website: "",
      })
    );
    expect(screen.getByText(/Thanks, Dana/)).toBeTruthy();
  });

  it("says what happened when the send fails, and keeps the answers", async () => {
    send.mockResolvedValue({ ok: false, error: "server" });
    fillStepOne();
    fireEvent.click(next());
    fireEvent.change(field(/your name/i), { target: { value: "Dana" } });
    fireEvent.change(field(/work email/i), { target: { value: "dana@lakeview.org" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /book the call/i }));
    });
    expect(screen.getByRole("alert").textContent).toMatch(/didn't go through/);
    expect(field(/work email/i).value).toBe("dana@lakeview.org");
  });

  it("takes you back to the step with the field the server refused", async () => {
    send.mockResolvedValue({ ok: false, fields: { school: "Add your school's name." } });
    fillStepOne();
    fireEvent.click(next());
    fireEvent.change(field(/your name/i), { target: { value: "Dana" } });
    fireEvent.change(field(/work email/i), { target: { value: "dana@lakeview.org" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /book the call/i }));
    });
    expect(screen.getByText(/Step 1 of 2/).closest("fieldset")?.hidden).toBe(false);
    expect(document.activeElement).toBe(field(/school name/i));
  });
});
