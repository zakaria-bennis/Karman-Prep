/**
 * The design system's Row truncates both of its lines. A parent row carries
 * a date, a due time or a week in its lines, which must never be cut on a
 * phone (rule 55), so these rows let the lines wrap. For promotion into
 * Row.tsx as a `wrap` prop.
 */
export const WRAP_ROWS = "[&_.truncate]:whitespace-normal";
