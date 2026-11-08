import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../cn";
import { useTheme } from "../theme";
import { useLiquidGlass } from "./useLiquidGlass";
import { Orb } from "./Orb";

/*
 * GlassButton: ported from the Apple Tahoe Liquid Glass Button (21st.dev 12460)
 * with Karman's tokens. The one highlighted call to action per screen is the
 * `primary` variant (accent-tinted glass with accent-ink text); every other
 * button is clear glass; everything else on a screen is a text link.
 */
export interface GlassButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled"
> {
  variant?: "primary" | "glass";
  size?: "md" | "sm" | "icon";
  icon?: ReactNode;
  loading?: boolean;
  /** Stays legible and focusable; clicks are ignored and announced. */
  disabled?: boolean;
  /** Force a recipe; the gallery sets the default through the theme provider. */
  recipe?: "refract" | "frost";
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton(
  {
    variant = "glass",
    size = "md",
    icon,
    loading = false,
    disabled = false,
    recipe,
    className,
    children,
    onClick,
    ...rest
  },
  ref
) {
  const theme = useTheme();
  const rootRef = useRef<HTMLButtonElement | null>(null);
  const primary = variant === "primary";
  const glass = useLiquidGlass(rootRef, {
    recipe: recipe ?? theme.glass,
    dark: theme.dark,
    tint: primary ? theme.resolved.accent : undefined,
    refraction: size === "icon" ? 10 : 14,
    interactive: !disabled,
  });
  const [orb, setOrb] = useState(false);
  useEffect(() => {
    if (!loading) {
      setOrb(false);
      return;
    }
    const t = setTimeout(() => setOrb(true), 400);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <button
      ref={(n) => {
        rootRef.current = n;
        if (typeof ref === "function") ref(n);
        else if (ref) ref.current = n;
      }}
      type="button"
      data-recipe={glass.recipe}
      data-tinted={primary ? "" : undefined}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (disabled || loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      className={cn(
        "k-glass inline-flex select-none items-center justify-center gap-2 whitespace-nowrap border-0 bg-transparent font-semibold leading-none",
        "min-h-tap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "sm" && "h-11 px-4 text-[14px]",
        size === "icon" && "h-11 w-11 min-w-11 shrink-0 px-0",
        primary ? "text-accent-ink" : "text-text",
        disabled ? "cursor-not-allowed text-muted" : "cursor-pointer",
        className
      )}
      {...rest}
    >
      {glass.layers}
      {orb ? (
        <Orb size={20} className="shrink-0" />
      ) : icon ? (
        <span className="shrink-0 [&>svg]:block">{icon}</span>
      ) : null}
      {children ? (
        <span className={cn("relative", size === "icon" && "sr-only")}>{children}</span>
      ) : null}
    </button>
  );
});
