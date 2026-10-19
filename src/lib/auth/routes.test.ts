import { createRedirect } from "@clerk/backend/internal";
import { describe, expect, it } from "vitest";
import { KARMAN_AUTH_ROUTES } from "./routes";

describe("Clerk's existing on-site authentication routes", () => {
  it.each([
    "/diagnostic",
    "/learn/practice/rw-skill-central-ideas-and-details",
    "/learn/earlier/math?resume=saved-attempt",
    "/dashboard/parent/student-id",
    "/tutor/student-id",
    "/admin/questions/preview/rapid?questionId=example",
  ])("keeps %s as the return destination", (path) => {
    const destination = new URL(path, "https://karmanprep.com").toString();
    const redirects = createRedirect({
      ...KARMAN_AUTH_ROUTES,
      baseUrl: destination,
      publishableKey: `pk_test_${Buffer.from("fixture.accounts.dev$").toString("base64")}`,
      redirectAdapter: (url: string) => url,
    });
    const signIn = new URL(redirects.redirectToSignIn({ returnBackUrl: destination }));
    expect(signIn.origin).toBe("https://karmanprep.com");
    expect(signIn.pathname).toBe("/auth/sign-in");
    expect(signIn.searchParams.get("redirect_url")).toBe(destination);
    const signUp = new URL(redirects.redirectToSignUp({ returnBackUrl: destination }));
    expect(signUp.origin).toBe("https://karmanprep.com");
    expect(signUp.pathname).toBe("/auth/sign-up");
    expect(signUp.searchParams.get("redirect_url")).toBe(destination);
  });
});
