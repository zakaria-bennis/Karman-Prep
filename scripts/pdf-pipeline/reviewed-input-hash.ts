import { createHash } from "node:crypto";

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Hash parsed JSON without depending on property order in one serializer. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (["string", "number", "boolean"].includes(typeof value)) return JSON.stringify(value);
    if (value === null) return "null";
    throw new Error("Frozen row contains a non-JSON value");
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}
