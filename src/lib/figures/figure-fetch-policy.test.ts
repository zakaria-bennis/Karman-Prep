import { describe, expect, it } from "vitest";
import { figureFetchPolicy } from "./figure-fetch-policy";

const origin = "https://karmanprep.com";
const path = `/admin/questions/student-view/63e1a08c-ee8e-545f-ae54-60f9cc63c982/figure/${"a".repeat(64)}?payload_sha256=${"b".repeat(64)}`;
describe("private figure fetch credentials", () => {
  it.each([path, `${origin}${path}`])(
    "inlines the canonical same-origin private route: %s",
    (src) => {
      expect(figureFetchPolicy(src, origin)).toEqual({
        inlineSvg: true,
        credentials: "same-origin",
      });
    }
  );
  it.each([
    `https://evil.example${path}`,
    `//evil.example${path}`,
    `${origin}.evil.example${path}`,
    `${origin}@evil.example${path}`,
    `${origin}:443${path}`,
    `/public${path}`,
    path.replace("student-view", "student-view%2f"),
    path.replace("/figure/", "/figure%2f"),
    path.replace("/figure/", "/junk/../figure/"),
    path.replace("63e1a08c-ee8e-545f-ae54-60f9cc63c982", "not-a-uuid"),
    path.replace("63e1a08c-ee8e-545f-ae54-60f9cc63c982", "63e1a08c-ee8e-045f-ae54-60f9cc63c982"),
    path.replace("a".repeat(64), "a".repeat(63)),
    path.replace("payload_sha256", "other_pin"),
    path.replace("b".repeat(64), "B".repeat(64)),
    `${path}&payload_sha256=${"b".repeat(64)}`,
    `${path}&extra=value`,
    `${path}#fragment`,
    path.split("?")[0],
    `data:image/svg+xml,${path}`,
  ])("omits credentials for lookalike/malformed/noncanonical paths: %s", (src) => {
    expect(figureFetchPolicy(src, origin)).toEqual({ inlineSvg: false, credentials: "omit" });
  });
  it.each(["/ordinary.svg", "/ordinary.svg?v=1", "https://external.example/image.svg#x"])(
    "retains ordinary SVG detection and credential omission: %s",
    (src) => {
      expect(figureFetchPolicy(src, origin)).toEqual({ inlineSvg: true, credentials: "omit" });
    }
  );
  it("does not grant cookies to a malicious URL just because it ends in SVG", () => {
    expect(figureFetchPolicy(`https://evil.example${path}.svg`, origin)).toEqual({
      inlineSvg: true,
      credentials: "omit",
    });
  });
});
