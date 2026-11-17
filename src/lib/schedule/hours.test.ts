import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, retrieve, upsert } = vi.hoisted(() => ({
  create: vi.fn(),
  retrieve: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/stripe/client", () => ({
  stripe: { checkout: { sessions: { create, retrieve } } },
  getOrCreateCustomer: vi.fn(async () => ({ id: "cus_1" })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "users"
        ? {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { id: "uuid-1" } }) }),
            }),
          }
        : { upsert },
  }),
}));

import { GUARANTEE } from "@/lib/marketing/offer";
import { createHoursCheckout, hoursPaid, hoursSalesOpen, recordHoursPurchase } from "./hours";
import { HOURS_KIND, HOURS_MAX, hoursCheckoutBodySchema } from "./hours-shared";

const paidSession = (over: object = {}) => ({
  id: "cs_test_1",
  status: "complete",
  payment_status: "paid",
  amount_total: 74750,
  metadata: { kind: HOURS_KIND, userId: "user_1" },
  line_items: { data: [{ quantity: 5 }] },
  ...over,
});

beforeEach(() => {
  create.mockReset();
  retrieve.mockReset();
  upsert.mockReset().mockResolvedValue({ error: null });
});

describe("when hours can be sold", () => {
  it("always on a test key, never with no key", () => {
    expect(hoursSalesOpen({ STRIPE_SECRET_KEY: "sk_test_abc" })).toBe(true);
    expect(hoursSalesOpen({})).toBe(false);
  });

  it("on a live key only once the founder has switched it on", () => {
    expect(hoursSalesOpen({ STRIPE_SECRET_KEY: "sk_live_abc" })).toBe(false);
    expect(hoursSalesOpen({ STRIPE_SECRET_KEY: "sk_live_abc", PRIVATE_HOURS_SALES: "on" })).toBe(
      true
    );
  });
});

describe("what may be asked for", () => {
  it("one hour to the most, whole hours only", () => {
    expect(hoursCheckoutBodySchema.safeParse({ hours: 1 }).success).toBe(true);
    expect(hoursCheckoutBodySchema.safeParse({ hours: HOURS_MAX }).success).toBe(true);
    expect(hoursCheckoutBodySchema.safeParse({ hours: 0 }).success).toBe(false);
    expect(hoursCheckoutBodySchema.safeParse({ hours: HOURS_MAX + 1 }).success).toBe(false);
    expect(hoursCheckoutBodySchema.safeParse({ hours: 1.5 }).success).toBe(false);
  });
});

describe("opening a payment", () => {
  it("charges the hour's price from the offer file and lets the amount be changed on the page", async () => {
    create.mockResolvedValue({ id: "cs_test_1", client_secret: "secret" });
    await createHoursCheckout({
      clerkId: "user_1",
      email: "a@b.c",
      hours: 3,
      returnUrl: "https://x/y",
    });
    const args = create.mock.calls[0][0];
    const item = args.line_items[0];
    expect(item.price_data.unit_amount).toBe(Math.round(GUARANTEE.private.extraSessionPrice * 100));
    expect(item.quantity).toBe(3);
    expect(item.adjustable_quantity).toEqual({ enabled: true, minimum: 1, maximum: HOURS_MAX });
    expect(args.ui_mode).toBe("elements");
    expect(args.metadata).toEqual({ kind: HOURS_KIND, userId: "user_1" });
  });
});

describe("a finished payment", () => {
  it("counts the hours from what was paid for, not from what was first asked", async () => {
    retrieve.mockResolvedValue(paidSession());
    expect(await hoursPaid("cs_test_1", "user_1")).toEqual({ hours: 5, amountCents: 74750 });
  });

  it("is nothing to someone else, when unpaid, or when it was for something else", async () => {
    retrieve.mockResolvedValue(paidSession());
    expect(await hoursPaid("cs_test_1", "user_2")).toBeNull();
    retrieve.mockResolvedValue(paidSession({ payment_status: "unpaid" }));
    expect(await hoursPaid("cs_test_1", "user_1")).toBeNull();
    retrieve.mockResolvedValue(paidSession({ metadata: { planId: "cohort", userId: "user_1" } }));
    expect(await hoursPaid("cs_test_1", "user_1")).toBeNull();
  });

  it("is kept once, however many times Stripe says so", async () => {
    retrieve.mockResolvedValue(paidSession());
    const said = await recordHoursPurchase(paidSession() as never);
    expect(said).toBe("5 hours");
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "uuid-1",
        hours: 5,
        amount_cents: 74750,
        stripe_checkout_session_id: "cs_test_1",
      },
      { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }
    );
  });

  it("keeps nothing for a payment that did not clear", async () => {
    retrieve.mockResolvedValue(paidSession({ status: "open", payment_status: "unpaid" }));
    expect(await recordHoursPurchase(paidSession() as never)).toBe("not paid");
    expect(upsert).not.toHaveBeenCalled();
  });
});
