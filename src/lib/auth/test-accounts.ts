// The test accounts the local copy can act as. They are whatever seeded accounts the database it is
// pointed at really has (every seeded clerk_id starts with dev_seed_; scripts/seed-dev.mjs makes them,
// and the local-only persona seed adds more), read by test-accounts-list.ts. Settings lists them under
// "Test accounts" in each portal, and /dev/as switches to one. None of this exists in a production
// build (src/lib/auth/dev-auth.ts).

export interface TestAccount {
  id: string;
  name: string;
}

/** A brand-new visitor pressing "Get started" on the local copy becomes this student
 *  (scripts/seed-dev.mjs: a student who has done nothing yet). */
export const NEW_TEST_STUDENT = "dev_seed_student_fresh";

/** Only a seeded account can be switched to. */
export const isTestAccountId = (id: string | null | undefined): id is string =>
  typeof id === "string" && /^dev_seed_[a-z0-9_]{1,60}$/.test(id);

/** The address that switches to an account and opens its portal. */
export const switchHref = (id: string) => `/dev/as?who=${id}`;
