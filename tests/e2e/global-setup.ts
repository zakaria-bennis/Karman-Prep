// ============================================================
// Playwright global setup — runs once before the suite.
//
// Ensures the dev fixtures are seeded so impersonation tests can
// rely on dev_seed_admin / dev_seed_student_mid etc. Idempotent:
// the script upserts on natural keys, so running it on every
// suite invocation is safe + fast.
// ============================================================

import { spawn } from "node:child_process";

export default async function globalSetup() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", "seed:dev"], {
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`seed:dev exited with code ${code}`));
    });
  });
}
