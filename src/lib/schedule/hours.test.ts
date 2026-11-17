import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, retrieve, update, list, upsert } = vi.hoisted(() => ({
  create: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/stripe/client", () => ({
  stripe: { paymentIntents: { create, retrieve, update }, paymentMethods: { list } },
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

import { GUARANTEE, PRIVATE_PACKAGES } from "@/lib/marketing/offer";
import {
  hoursPaid,
  hoursSalesOpen,
  openHoursPayment,
  recordHoursPayment,
  savedCard,
  setHours,
} from "./hours";
import {
  HOURS_KIND,
  HOURS_MAX,
  dollars,
  hoursBodySchema,
  hoursPriceCents,
  hoursSavingCents,
  sameForMore,
} from "./hours-shared";

const single = Math.round(GUARANTEE.private.extraSessionPrice * 100);
const twenty = PRIVATE_PACKAGES.find((p) => p.hours === 20)!.price * 100;
const intent = (over: object = {}) => ({
  id: "pi_1",
  status: "succeeded",
  amount_received: hoursPriceCents(5),
  metadata: { kind: HOURS_KIND, userId: "user_1", hours: "5" },
  ...over,
});

beforeEach(() => {
  for (const mock of [create, retrieve, update, list, upsert]) mock.mockReset();
  upsert.mockResolvedValue({ error: null });
  list.mockResolvedValue({ data: [] });
});

describe("what hours cost", () => {
  it("a single hour is the price in the offer file", () => {
    expect(hoursPriceCents(1)).toBe(single);
    expect(hoursPriceCents(7)).toBe(7 * single);
    expect(hoursSavingCents(7)).toBe(0);
  });

  it("twenty hours is the Private 20 package price, which is cheaper", () => {
    expect(hoursPriceCents(20)).toBe(twenty);
    expect(hoursPriceCents(20)).toBeLessThan(20 * single);
    expect(hoursSavingCents(20)).toBe(20 * single - twenty);
  });

  it("more than a package is the package plus single hours, and two packages are two packages", () => {
    expect(hoursPriceCents(25)).toBe(twenty + 5 * single);
    expect(hoursPriceCents(40)).toBe(2 * twenty);
  });

  it("never costs less for more hours", () => {
    for (let n = 1; n < HOURS_MAX; n++)
      expect(hoursPriceCents(n + 1)).toBeGreaterThanOrEqual(hoursPriceCents(n));
  });

  it("offers the whole package when it costs no more: 18 hours are charged as 20", () => {
    expect(hoursPriceCents(18)).toBe(twenty);
    expect(sameForMore(18)).toBe(20);
    expect(sameForMore(5)).toBeNull();
    expect(sameForMore(20)).toBeNull();
  });

  it("is written with cents only when there are some", () => {
    expect(dollars(14950)).toBe("$149.50");
    expect(dollars(249500)).toBe("$2,495");
  });

  it("one hour to the most, whole hours only", () => {
    expect(hoursBodySchema.safeParse({ hours: 1 }).success).toBe(true);
    expect(hoursBodySchema.safeParse({ hours: HOURS_MAX }).success).toBe(true);
    expect(hoursBodySchema.safeParse({ hours: 0 }).success).toBe(false);
    expect(hoursBodySchema.safeParse({ hours: HOURS_MAX + 1 }).success).toBe(false);
    expect(hoursBodySchema.safeParse({ hours: 1.5 }).success).toBe(false);
  });
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

describe("opening and changing a payment", () => {
  it("opens it at the server's price, keeps the card for next time, and offers the card on file", async () => {
    create.mockResolvedValue({ id: "pi_1", client_secret: "secret", amount: single });
    list.mockResolvedValue({ data: [{ id: "pm_1", card: { brand: "visa", last4: "4242" } }] });
    const { card } = await openHoursPayment({ clerkId: "user_1", email: "a@b.c", hours: 1 });
    const args = create.mock.calls[0][0];
    expect(args.amount).toBe(single);
    expect(args.customer).toBe("cus_1");
    expect(args.payment_method_options.card.setup_future_usage).toBe("on_session");
    expect(args.setup_future_usage).toBeUndefined();
    expect(args.metadata).toEqual({ kind: HOURS_KIND, userId: "user_1", hours: "1" });
    expect(card).toEqual({ id: "pm_1", brand: "visa", last4: "4242" });
  });

  it("says there is no card on file when Stripe holds none", async () => {
    expect(await savedCard("cus_1")).toBeNull();
  });

  it("changes the hours and the price together", async () => {
    retrieve.mockResolvedValue(intent({ status: "requires_payment_method" }));
    expect(await setHours("pi_1", "user_1", 20)).toBe(twenty);
    expect(update).toHaveBeenCalledWith("pi_1", {
      amount: twenty,
      metadata: { kind: HOURS_KIND, userId: "user_1", hours: "20" },
    });
  });

  it("will not change someone else's payment, or one already paid", async () => {
    retrieve.mockResolvedValue(intent({ status: "requires_payment_method" }));
    expect(await setHours("pi_1", "user_2", 20)).toBeNull();
    retrieve.mockResolvedValue(intent());
    expect(await setHours("pi_1", "user_1", 20)).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});

describe("a finished payment", () => {
  it("is kept once, by its payment id", async () => {
    expect(await recordHoursPayment(intent() as never)).toBe("5 hours");
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "uuid-1",
        hours: 5,
        amount_cents: hoursPriceCents(5),
        stripe_payment_intent_id: "pi_1",
      },
      { onConflict: "stripe_payment_intent_id", ignoreDuplicates: true }
    );
  });

  it("tells the page its hours, and keeps the purchase", async () => {
    retrieve.mockResolvedValue(intent());
    expect(await hoursPaid("pi_1", "user_1")).toEqual({ hours: 5 });
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("is nothing to someone else, or before it has succeeded", async () => {
    retrieve.mockResolvedValue(intent());
    expect(await hoursPaid("pi_1", "user_2")).toBeNull();
    retrieve.mockResolvedValue(intent({ status: "requires_action" }));
    expect(await hoursPaid("pi_1", "user_1")).toBeNull();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("is not believed when the amount paid is not what those hours cost", async () => {
    const cheap = intent({ metadata: { kind: HOURS_KIND, userId: "user_1", hours: "20" } });
    expect(await recordHoursPayment(cheap as never)).toBe("not a paid purchase of hours");
    expect(upsert).not.toHaveBeenCalled();
  });
});
