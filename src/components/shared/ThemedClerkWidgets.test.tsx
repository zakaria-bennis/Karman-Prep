// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  palette: null as unknown,
  signIn: vi.fn(),
  signUp: vi.fn(),
  userButton: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: unknown) => {
    mocks.signIn(props);
    return null;
  },
  SignUp: (props: unknown) => {
    mocks.signUp(props);
    return null;
  },
  UserButton: (props: unknown) => {
    mocks.userButton(props);
    return null;
  },
}));
vi.mock("./ThemeProvider", () => ({ useTheme: () => ({ palette: mocks.palette }) }));
import { SITE_THEMES } from "@/lib/themes/palettes";
import { ThemedSignIn, ThemedSignUp, ThemedUserButton } from "./ThemedClerkWidgets";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.palette = SITE_THEMES.find((t) => t.id === "paper")!;
});
describe("account theme at supported Clerk widget boundaries", () => {
  it("updates sign-in appearance while preserving navigation on a theme change", () => {
    const rendered = render(
      <ThemedSignIn routing="path" path="/auth/sign-in" signUpUrl="/auth/sign-up" />
    );
    expect(mocks.signIn.mock.lastCall?.[0]).toMatchObject({
      routing: "path",
      path: "/auth/sign-in",
      signUpUrl: "/auth/sign-up",
      appearance: { variables: { colorBackground: "#f5f7fa", colorText: "#18283c" } },
    });
    mocks.palette = SITE_THEMES.find((t) => t.id === "plum")!;
    rendered.rerender(
      <ThemedSignIn routing="path" path="/auth/sign-in" signUpUrl="/auth/sign-up" />
    );
    expect(mocks.signIn.mock.lastCall?.[0]).toMatchObject({
      path: "/auth/sign-in",
      signUpUrl: "/auth/sign-up",
      appearance: { variables: { colorBackground: "#201321", colorText: "#f9edf8" } },
    });
  });
  it("preserves sign-up paths and switches to a light appearance", () => {
    render(<ThemedSignUp routing="path" path="/auth/sign-up" signInUrl="/auth/sign-in" />);
    expect(mocks.signUp.mock.lastCall?.[0]).toMatchObject({
      path: "/auth/sign-up",
      signInUrl: "/auth/sign-in",
      appearance: { baseTheme: undefined, variables: { colorInputText: "#18283c" } },
    });
  });
  it("preserves explicit avatar and profile customization when applying the account palette", () => {
    render(
      <ThemedUserButton
        appearance={{ elements: { userButtonAvatarBox: "w-7 h-7" } }}
        userProfileProps={{ appearance: { elements: { card: "custom-card" } } }}
      />
    );
    expect(mocks.userButton.mock.lastCall?.[0]).toMatchObject({
      appearance: {
        elements: { userButtonAvatarBox: "w-7 h-7" },
        variables: { colorText: "#18283c" },
      },
      userProfileProps: {
        appearance: {
          elements: { card: "custom-card" },
          variables: { colorBackground: "#f5f7fa" },
        },
      },
    });
  });
});
