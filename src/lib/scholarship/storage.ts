// ============================================================
// Private file storage for scholarship score reports.
//
// Score reports hold a student's name and scores, so they are
// never public. Two drivers sit behind one small interface, so
// the storage can be swapped without touching callers:
//
//   local  development: files on disk, outside the repo, in
//          LOCAL_UPLOADS_DIR or the OS temp folder. Shared by
//          every worktree, so any local dev server can read a
//          report uploaded through another one.
//   r2     production: the Worker's R2 binding, under a private
//          key. Files are read back through an admin-checked
//          route, never through R2_PUBLIC_URL.
//
// Pick a driver with PRIVATE_UPLOADS_DRIVER=local|r2. Without it,
// development uses local and production uses r2. When R2 is
// switched off (no binding), uploads fail with a clear message
// instead of crashing.
// ============================================================

export type StorageDriver = "local" | "r2";

export interface PrivateFileStore {
  readonly driver: StorageDriver;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

const KEY_PATTERN = /^scholarship\/[0-9a-f-]{36}\/[0-9a-f]{64}\.pdf$/;

/** Keys are built on the server from a claim id and the file's hash only. */
export function scholarshipReportKey(claimId: string, sha256: string): string {
  const key = `scholarship/${claimId.toLowerCase()}/${sha256.toLowerCase()}.pdf`;
  assertSafeKey(key);
  return key;
}

export function assertSafeKey(key: string): void {
  if (!KEY_PATTERN.test(key)) throw new Error("Unsafe storage key");
}

export function resolveDriver(env: {
  PRIVATE_UPLOADS_DRIVER?: string;
  NODE_ENV?: string;
}): StorageDriver {
  const explicit = env.PRIVATE_UPLOADS_DRIVER;
  if (explicit === "local" || explicit === "r2") return explicit;
  return env.NODE_ENV === "production" ? "r2" : "local";
}

async function localRoot(): Promise<string> {
  const path = await import("node:path");
  const os = await import("node:os");
  return process.env.LOCAL_UPLOADS_DIR || path.join(os.tmpdir(), "karman-local-uploads");
}

const localStore: PrivateFileStore = {
  driver: "local",
  async put(key, bytes) {
    assertSafeKey(key);
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.join(await localRoot(), key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
  },
  async get(key) {
    assertSafeKey(key);
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    try {
      return new Uint8Array(await fs.readFile(path.join(await localRoot(), key)));
    } catch {
      return null;
    }
  },
  async delete(key) {
    assertSafeKey(key);
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.rm(path.join(await localRoot(), key), { force: true });
  },
};

type R2ObjectLike = { arrayBuffer(): Promise<ArrayBuffer> };
type R2BucketLike = {
  put: (
    key: string,
    value: Uint8Array,
    opts?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectLike | null>;
  delete: (key: string) => Promise<unknown>;
};

async function r2Bucket(): Promise<R2BucketLike> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const bucket = (ctx?.env as { R2?: R2BucketLike } | undefined)?.R2;
    if (bucket) return bucket;
  } catch {
    // Not inside a Worker request.
  }
  throw new StorageUnavailableError(
    "File uploads are switched off on this server. Try again later or contact Karman."
  );
}

const r2Store: PrivateFileStore = {
  driver: "r2",
  async put(key, bytes, contentType) {
    assertSafeKey(key);
    await (await r2Bucket()).put(key, bytes, { httpMetadata: { contentType } });
  },
  async get(key) {
    assertSafeKey(key);
    const obj = await (await r2Bucket()).get(key);
    return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
  },
  async delete(key) {
    assertSafeKey(key);
    await (await r2Bucket()).delete(key);
  },
};

export function getPrivateFileStore(driver?: StorageDriver): PrivateFileStore {
  const d = driver ?? resolveDriver(process.env);
  return d === "r2" ? r2Store : localStore;
}
