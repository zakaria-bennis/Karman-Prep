// A stand-in for the Supabase query builder in server-action tests: every call is recorded, and each
// awaited query answers with what `answer` returns for it. No network.

export interface FakeOp {
  table: string;
  action: "select" | "insert" | "upsert" | "update" | "delete";
  payload?: unknown;
  options?: unknown;
  filters: Array<[string, ...unknown[]]>;
}

export type FakeAnswer = { data?: unknown; error?: { message: string; code?: string } | null };

export function fakeSupabase(answer: (op: FakeOp) => FakeAnswer = () => ({})) {
  const ops: FakeOp[] = [];
  const from = (table: string) => {
    const op: FakeOp = { table, action: "select", filters: [] };
    let started = false;
    const chain: Record<string, unknown> = {};
    const start = (action: FakeOp["action"]) => (payload?: unknown, options?: unknown) => {
      // a .select() after a write only asks for the written row back
      if (!started) {
        started = true;
        op.action = action;
        if (action !== "select") Object.assign(op, { payload, options });
        ops.push(op);
      }
      return chain;
    };
    for (const a of ["select", "insert", "upsert", "update", "delete"] as const)
      chain[a] = start(a);
    for (const f of ["eq", "ilike", "in", "is", "limit", "order", "maybeSingle", "single"])
      chain[f] = (...args: unknown[]) => (op.filters.push([f, ...args]), chain);
    chain.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => {
      try {
        const a = answer(op);
        return Promise.resolve({ data: a.data ?? null, error: a.error ?? null }).then(ok, bad);
      } catch (e) {
        return Promise.reject(e).then(ok, bad);
      }
    };
    return chain;
  };
  return { client: { from }, ops };
}
