// @vitest-environment node
//
// Guards the R2 presigned-URL path against regressing back to the AWS SDK,
// which crashes on the Cloudflare Worker runtime with
// "[unenv] fs.readFile is not implemented yet!". aws4fetch signs with
// fetch + WebCrypto only (no fs / Node deps), so the URL must come out as a
// well-formed SigV4 query-signed URL with no network or filesystem access.

import { describe, it, expect, beforeAll } from "vitest";
import { createPresignedPutUrl } from "./r2-presign";

describe("createPresignedPutUrl (aws4fetch, Worker-safe)", () => {
  beforeAll(() => {
    process.env.R2_ACCOUNT_ID = "testaccount123";
    process.env.R2_ACCESS_KEY_ID = "AKIAEXAMPLE";
    process.env.R2_SECRET_ACCESS_KEY = "secret-example";
    process.env.R2_BUCKET_NAME = "test-bucket";
  });

  it("produces a path-style SigV4 query-signed PUT URL", async () => {
    const { uploadUrl, expiresInSeconds } = await createPresignedPutUrl({
      key: "pdf-uploads/job-1/scan.pdf",
      contentType: "application/pdf",
      expiresInSeconds: 600,
    });
    const u = new URL(uploadUrl);
    // Path-style R2 endpoint + key.
    expect(u.host).toBe("testaccount123.r2.cloudflarestorage.com");
    expect(u.pathname).toBe("/test-bucket/pdf-uploads/job-1/scan.pdf");
    // SigV4 query auth (presigned), not header auth.
    expect(u.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(u.searchParams.has("X-Amz-Credential")).toBe(true);
    expect(u.searchParams.has("X-Amz-Signature")).toBe(true);
    expect(u.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(expiresInSeconds).toBe(600);
  });

  it("defaults the TTL to 15 minutes", async () => {
    const { uploadUrl, expiresInSeconds } = await createPresignedPutUrl({
      key: "x/y.pdf",
      contentType: "application/pdf",
    });
    expect(expiresInSeconds).toBe(900);
    expect(new URL(uploadUrl).searchParams.get("X-Amz-Expires")).toBe("900");
  });
});
