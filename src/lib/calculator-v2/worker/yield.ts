// The executor's default yield (AR-47): a MessageChannel macrotask, which lets queued messages and
// rendering run between units without the 4 ms clamp of nested timers. Pure TypeScript: no DOM.

/** Node's MessagePort keeps the process alive unless unref'd; browser ports have no unref. */
function unref(port: MessagePort): void {
  (port as MessagePort & { unref?: () => void }).unref?.();
}

/**
 * A yield that owns one MessageChannel, created on the first `yieldToEventLoop()` call (never at
 * module load). Each call resolves on its own message, in call order. `close()` closes both ports;
 * a yield still pending, and any later one, never resolves.
 */
export function messageChannelYield(): { yieldToEventLoop(): Promise<void>; close(): void } {
  let channel: MessageChannel | null = null,
    closed = false;
  const waiting: (() => void)[] = [];
  const open = (): MessageChannel => {
    const c = new MessageChannel();
    c.port1.onmessage = () => waiting.shift()?.();
    unref(c.port1);
    unref(c.port2);
    return c;
  };
  return {
    yieldToEventLoop: () =>
      new Promise<void>((resolve) => {
        if (closed) return;
        channel ??= open();
        waiting.push(resolve);
        channel.port2.postMessage(null);
      }),
    close() {
      if (closed) return;
      closed = true;
      waiting.length = 0;
      channel?.port1.close();
      channel?.port2.close();
    },
  };
}
