import { cn } from "../cn";

/** A plain "Karman" in the display face (Hanken Grotesk 800, -0.035em) until the founder's SVG arrives; never redrawn. */
export function Wordmark({ size = 23, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-tap items-center font-extrabold leading-none text-text",
        className
      )}
      style={{
        fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
        fontSize: size,
        letterSpacing: "-0.035em",
      }}
    >
      Karman
    </span>
  );
}
