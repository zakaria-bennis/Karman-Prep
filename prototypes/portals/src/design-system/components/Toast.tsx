import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../cn";
import { Icon } from "../icons";

/*
 * Toast and NotificationStack: three visible at once, the rest wait in line
 * (the queue model of Notification Stack, 21st.dev 35703, sltowl). The cards
 * use the Panel recipe and the one easing. Toast (24297, cnippet) was fetched
 * but needs base-ui, so nothing of it is used.
 */
export type ToastKind = "status" | "success" | "error";
export interface ToastInput {
  title: string;
  detail?: string;
  kind?: ToastKind;
  action?: { label: string; onClick(): void };
}
interface ToastItem extends ToastInput {
  id: number;
  visible: boolean;
}

const Ctx = createContext<{ push(t: ToastInput): void; clear(): void } | null>(null);
const MAX_VISIBLE = 3;
const MAX_QUEUED = 20;
const LIFE = 6000;

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast needs a ToastProvider");
  return c;
}

export function ToastProvider({
  children,
  inline = false,
}: {
  children: ReactNode;
  inline?: boolean;
}) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const queue = useRef<ToastInput[]>([]);
  const serial = useRef(0);
  const [live, setLive] = useState("");

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, visible: false } : it)));
    setTimeout(() => {
      setItems((list) => {
        const rest = list.filter((it) => it.id !== id);
        const next = queue.current.shift();
        return next ? [...rest, { ...next, id: ++serial.current, visible: true }] : rest;
      });
    }, 220);
  }, []);

  const push = useCallback((t: ToastInput) => {
    setLive(t.title);
    setItems((list) => {
      if (list.length < MAX_VISIBLE)
        return [...list, { ...t, id: ++serial.current, visible: true }];
      if (queue.current.length < MAX_QUEUED) queue.current.push(t);
      return list;
    });
  }, []);
  const clear = useCallback(() => {
    queue.current = [];
    setItems((list) => list.map((it) => ({ ...it, visible: false })));
    setTimeout(() => setItems([]), 220);
  }, []);
  const value = useMemo(() => ({ push, clear }), [push, clear]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <NotificationStack items={items} onDismiss={dismiss} inline={inline} />
      <span role="status" aria-live="polite" className="sr-only">
        {live}
      </span>
    </Ctx.Provider>
  );
}

function Card({ item, onDismiss }: { item: ToastItem; onDismiss(): void }) {
  useEffect(() => {
    if (item.kind === "error") return;
    const t = setTimeout(onDismiss, LIFE);
    return () => clearTimeout(t);
  }, [item.kind, onDismiss]);
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-panel border border-line bg-panel py-3 pl-4 pr-2 transition-[opacity,transform] ease-k",
        item.visible ? "opacity-100" : "translate-y-2 opacity-0"
      )}
      style={{ transitionDuration: "220ms" }}
    >
      <span
        className={cn(
          "mt-0.5 shrink-0",
          item.kind === "error"
            ? "text-negative"
            : item.kind === "success"
              ? "text-positive"
              : "text-muted"
        )}
      >
        <Icon
          name={item.kind === "error" ? "alert" : item.kind === "success" ? "check" : "info"}
          size={20}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{item.title}</p>
        {item.detail ? <p className="text-dense text-muted">{item.detail}</p> : null}
        {item.action ? (
          <button
            type="button"
            onClick={item.action.onClick}
            className="mt-1 min-h-tap text-dense font-semibold text-accent"
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="-mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-control text-muted hover:text-text"
      >
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}

export function NotificationStack({
  items,
  onDismiss,
  inline,
}: {
  items: ToastItem[];
  onDismiss(id: number): void;
  inline?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div
      className={cn(
        "z-toast grid w-[min(100%-32px,380px)] gap-2",
        inline ? "relative" : "pointer-events-none fixed bottom-4 right-4"
      )}
    >
      {items.map((it) => (
        <div key={it.id} className="pointer-events-auto">
          <Card item={it} onDismiss={() => onDismiss(it.id)} />
        </div>
      ))}
    </div>
  );
}
