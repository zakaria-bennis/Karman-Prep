import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { visitorOrigin } from "./origin";

const req = (url: string, headers: Record<string, string>) => new NextRequest(url, { headers });

describe("the address a redirect is built on", () => {
  it("is the site the visitor asked for, not the machine behind a tunnel", () => {
    expect(
      visitorOrigin(
        req("https://localhost:3400/checkout/done", {
          host: "test.trycloudflare.com",
          "x-forwarded-proto": "https",
        })
      )
    ).toBe("https://test.trycloudflare.com");
    expect(visitorOrigin(req("http://localhost:3400/x", { host: "localhost:3400" }))).toBe(
      "http://localhost:3400"
    );
    expect(visitorOrigin(req("https://karmanprep.com/x", { host: "karmanprep.com" }))).toBe(
      "https://karmanprep.com"
    );
  });
  it("falls back to the request's own origin when the host is not a plain host name", () => {
    expect(visitorOrigin(req("https://karmanprep.com/x", { host: "evil.com/path?x" }))).toBe(
      "https://karmanprep.com"
    );
  });
});
