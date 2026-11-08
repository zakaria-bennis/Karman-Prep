import { forwardRef } from "react";
import { GlassButton, type GlassButtonProps } from "@/design-system/glass/GlassButton";

/*
 * The one highlighted action, with a legible disabled state: a disabled
 * primary drops the accent tint and renders as clear glass with muted text
 * (12.9:1 light, 10.2:1 dark on the clear lens, against 1.1:1 for muted text
 * on the tinted lens). It stays focusable and aria-disabled. Candidate for
 * promotion into GlassButton itself (design-system/glass/GlassButton.tsx).
 */
export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<GlassButtonProps, "variant">>(
  function PrimaryButton({ disabled, ...rest }, ref) {
    return (
      <GlassButton
        ref={ref}
        variant={disabled ? "glass" : "primary"}
        disabled={disabled}
        {...rest}
      />
    );
  }
);
