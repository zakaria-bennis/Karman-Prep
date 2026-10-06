"use client";

import type { ComponentProps } from "react";
import { SignIn, SignUp, UserButton } from "@clerk/nextjs";
import { useTheme } from "./ThemeProvider";
import { clerkAppearanceForTheme } from "@/lib/clerkAppearance";

export function ThemedSignIn(props: ComponentProps<typeof SignIn>) {
  const { palette } = useTheme();
  return <SignIn {...props} appearance={clerkAppearanceForTheme(palette)} />;
}
export function ThemedSignUp(props: ComponentProps<typeof SignUp>) {
  const { palette } = useTheme();
  return <SignUp {...props} appearance={clerkAppearanceForTheme(palette)} />;
}
export function ThemedUserButton({
  appearance,
  userProfileProps,
  ...props
}: ComponentProps<typeof UserButton>) {
  const { palette } = useTheme();
  const themed = clerkAppearanceForTheme(palette);
  return (
    <UserButton
      {...props}
      userProfileProps={{
        ...userProfileProps,
        appearance: {
          ...themed,
          ...userProfileProps?.appearance,
          variables: { ...themed.variables, ...userProfileProps?.appearance?.variables },
          elements: { ...themed.elements, ...userProfileProps?.appearance?.elements },
        },
      }}
      appearance={{
        ...themed,
        ...appearance,
        variables: { ...themed.variables, ...appearance?.variables },
        elements: { ...themed.elements, ...appearance?.elements },
      }}
    />
  );
}
