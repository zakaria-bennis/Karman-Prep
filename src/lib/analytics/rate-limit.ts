// A small fixed-window counter per visit (session id). It lives in the server's memory, so on
// Cloudflare each Worker instance counts on its own: enough to stop one runaway tab from
// flooding the table, not a security wall. Old windows are swept as new ones arrive.

export class SessionRateLimiter {
  private windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly maxKeys = 10_000
  ) {}

  /** How many of `wanted` events this session may still send in the current window. */
  take(key: string, wanted: number, now = Date.now()): number {
    let w = this.windows.get(key);
    if (!w || now - w.start >= this.windowMs) {
      if (this.windows.size >= this.maxKeys) this.sweep(now);
      w = { start: now, count: 0 };
      this.windows.set(key, w);
    }
    const granted = Math.max(0, Math.min(wanted, this.limit - w.count));
    w.count += granted;
    return granted;
  }

  private sweep(now: number) {
    for (const [k, w] of this.windows) if (now - w.start >= this.windowMs) this.windows.delete(k);
    // Still full (a burst of new visits): start over rather than grow without end.
    if (this.windows.size >= this.maxKeys) this.windows.clear();
  }
}
