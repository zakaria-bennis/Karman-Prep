"use client";

// The Page Studio screen: the page list, the page itself in a frame, and your notes. Opening a page
// can switch who you're viewing the site as (a sample student for the student portal, a parent for
// the parent portal), so every page shows with real-looking data. Saving only ever writes notes.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FLIP_PAGES,
  pageById,
  type Persona,
  type SampleKey,
  type StudioPage,
} from "@/lib/page-studio/inventory";
import { fillPath, matchRoute, paramNames } from "@/lib/page-studio/routes";
import type { NoteCategory, ViewAsInput, Viewport } from "@/lib/page-studio/schemas";
import type { PageMark, StudioAccount, StudioNote, ViewingAs } from "@/lib/page-studio/types";
import {
  actionBrief,
  actionDeleteNote,
  actionMarkPage,
  actionReply,
  actionSaveNote,
  actionSendNotes,
  actionSetNoteStatus,
  actionStudioState,
  actionViewAs,
} from "../actions";
import { DEVICES, MODES, type Mode } from "./devices";
import Frame from "./Frame";
import NoteComposer from "./NoteComposer";
import NotesPanel from "./NotesPanel";
import PageList from "./PageList";
import Toolbar from "./Toolbar";
import { useFrameBridge, type Pick } from "./useFrameBridge";
import styles from "./studio.module.css";

const STORE = "page-studio:v1";
const OPEN = new Set(["draft", "sent", "question", "working", "in_pr"]);

interface Saved {
  pageId?: string;
  viewport?: Viewport;
  matchPage?: boolean;
  seen?: Record<string, string>;
  roleAccount?: Record<string, string>;
}

function load(): Saved {
  try {
    return JSON.parse(window.localStorage.getItem(STORE) ?? "{}") as Saved;
  } catch {
    return {};
  }
}

function save(patch: Saved) {
  try {
    window.localStorage.setItem(STORE, JSON.stringify({ ...load(), ...patch }));
  } catch {
    // private window: the studio still works, it just won't remember
  }
}

/** Who should be looking at a page: null when anyone will do. */
function wantedRole(as: Persona): "self" | "student" | "parent" | "tutor" | null {
  if (as === "visitor") return null;
  if (as === "admin") return "self";
  if (as === "teacher") return "tutor";
  return as;
}

function personaLabel(v: ViewingAs | null): string {
  if (!v) return "Admin (yourself)";
  return v.name ? `${v.role}: ${v.name}` : `${v.role} (no account)`;
}

interface Props {
  initialNotes: StudioNote[];
  initialMarks: Record<string, PageMark>;
  accounts: StudioAccount[];
  initialViewing: ViewingAs | null;
  samples: Record<SampleKey, string>;
}

export default function Studio({
  initialNotes,
  initialMarks,
  accounts,
  initialViewing,
  samples,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [marks, setMarks] = useState(initialMarks);
  const [viewing, setViewing] = useState(initialViewing);
  const [pageId, setPageId] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [leftSite, setLeftSite] = useState(false);
  const [mode, setMode] = useState<Mode>("browse");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [scale, setScale] = useState(1);
  const [showEdits, setShowEdits] = useState(true);
  const [matchPage, setMatchPage] = useState(true);
  const [pick, setPick] = useState<(Pick & { whole?: boolean }) | null>(null);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"none" | "pages" | "notes">("none");
  const seen = useRef<Record<string, string>>({});
  const roleAccount = useRef<Record<string, string>>({});
  const viewingRef = useRef(viewing);
  viewingRef.current = viewing;

  const say = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 5000);
  }, []);

  const page = pageId ? (pageById(pageId) ?? null) : null;
  const visibleNotes = useMemo(() => notes.filter((n) => n.status !== "dismissed"), [notes]);
  const pageNotes = useMemo(
    () => visibleNotes.filter((n) => n.pageKey === pageId),
    [visibleNotes, pageId]
  );
  const openNotes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of visibleNotes)
      if (OPEN.has(n.status)) counts[n.pageKey] = (counts[n.pageKey] ?? 0) + 1;
    return counts;
  }, [visibleNotes]);

  const viewKey = (v: ViewingAs | null) => v?.userId ?? v?.role ?? "self";

  /** Fill a page's address from fixed examples and what you've opened before as this person. */
  const urlFor = useCallback(
    (p: StudioPage, v: ViewingAs | null): string | null => {
      const key = viewKey(v);
      const values: Record<string, string | undefined> = {};
      for (const name of paramNames(p.path)) {
        const sample = p.samples?.[name];
        values[name] =
          (sample ? samples[sample] : undefined) ??
          seen.current[`${key}|${p.id}:${name}`] ??
          (name !== "id" ? seen.current[`${key}|${p.area}:${name}`] : undefined);
      }
      return fillPath(p.path, values);
    },
    [samples]
  );

  /** Switch who you're viewing as so the page shows the right portal. Returns the new viewer. */
  const matchViewer = useCallback(
    async (p: StudioPage): Promise<ViewingAs | null> => {
      const want = wantedRole(p.as);
      const now = viewingRef.current;
      if (!want) return now;
      if (want === "self" && !now) return now;
      if (
        want !== "self" &&
        (now?.role === want || (want === "tutor" && now?.role === "affiliate_tutor"))
      )
        return now;
      let input: ViewAsInput = { mode: "self" };
      if (want !== "self") {
        const remembered = accounts.find(
          (a) => a.userId === roleAccount.current[want] && a.role === want
        );
        const pickAccount =
          remembered ??
          accounts.find((a) => a.role === want && a.sample) ??
          accounts.find((a) => a.role === want);
        input = pickAccount
          ? { mode: "user", userId: pickAccount.userId }
          : { mode: "role", role: want };
      }
      const res = await actionViewAs(input);
      if (!res.ok) {
        say(res.error);
        return now;
      }
      const next: ViewingAs | null = res.role
        ? { role: res.role, userId: input.mode === "user" ? input.userId : null, name: res.name }
        : null;
      setViewing(next);
      return next;
    },
    [accounts, say]
  );

  const go = useCallback(
    async (p: StudioPage) => {
      setPick(null);
      setPanel("none");
      setBusy(true);
      const v = matchPage ? await matchViewer(p) : viewingRef.current;
      setBusy(false);
      let url = urlFor(p, v);
      if (!url) {
        const from = p.from ? (matchRoute(p.from)?.page ?? null) : null;
        url = from ? urlFor(from, v) : null;
        say(
          p.from
            ? `${p.title} needs one to be picked first. Open one on this page and the studio will remember it.`
            : `${p.title}: ${p.hint ?? "type its address in a new tab"}.`
        );
        if (!url) return;
      }
      setPageId(p.id);
      setSrc(url);
      setLeftSite(false);
      setReloadKey((k) => k + 1);
      save({ pageId: p.id });
    },
    [matchPage, matchViewer, urlFor, say]
  );

  // First visit: the page from the link (?p=), else the last one, else the home page.
  useEffect(() => {
    const s = load();
    seen.current = s.seen ?? {};
    roleAccount.current = s.roleAccount ?? {};
    if (s.matchPage === false) setMatchPage(false);
    setViewport(s.viewport ?? (window.innerWidth < 760 ? "phone" : "desktop"));
    const wanted = new URLSearchParams(window.location.search).get("p") ?? s.pageId;
    void go(pageById(wanted ?? "") ?? FLIP_PAGES[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Claude's questions and progress show up without reloading.
  useEffect(() => {
    const t = window.setInterval(async () => {
      if (document.hidden) return;
      const res = await actionStudioState();
      if (res.ok) {
        setNotes(res.notes);
        setMarks(res.marks);
      }
    }, 30000);
    return () => window.clearInterval(t);
  }, []);

  const onUrl = useCallback((url: string | null) => {
    if (url === null) {
      setLeftSite(true);
      return;
    }
    setLeftSite(false);
    setLiveUrl(url);
    const m = matchRoute(url);
    setPageId(m?.page.id ?? null);
    if (m) {
      const key = viewKey(viewingRef.current);
      for (const [name, value] of Object.entries(m.params)) {
        if (m.page.samples?.[name]) continue;
        seen.current[`${key}|${m.page.id}:${name}`] = value;
        if (name !== "id") seen.current[`${key}|${m.page.area}:${name}`] = value;
      }
      save({ seen: seen.current, pageId: m.page.id });
      const studio = new URL(window.location.href);
      studio.searchParams.set("p", m.page.id);
      window.history.replaceState(null, "", studio);
    }
  }, []);

  const saveNote = useCallback(
    async (fields: Record<string, unknown>) => {
      if (!pageId || !liveUrl) {
        say("This address isn't in the page list, so a note can't be pinned here.");
        return false;
      }
      setBusy(true);
      const res = await actionSaveNote({
        pageKey: pageId,
        pagePath: liveUrl,
        persona: personaLabel(viewingRef.current),
        viewport,
        selector: "",
        elementLabel: "",
        elementText: "",
        elementHtml: "",
        oldText: null,
        newText: null,
        body: "",
        category: "other",
        ...fields,
      });
      setBusy(false);
      if (!res.ok) {
        say(res.error);
        return false;
      }
      setNotes((list) => [...list, res.note]);
      setActiveNote(res.note.id);
      return true;
    },
    [pageId, liveUrl, viewport, say]
  );

  const bridge = useFrameBridge({
    frame: frameRef,
    mode,
    scale,
    notes: pageNotes,
    showEdits,
    onUrl,
    onPick: (p) => setPick(p),
    onEdit: (e) => {
      void saveNote({
        kind: "copy",
        category: "copy",
        selector: e.selector,
        elementLabel: e.label,
        elementText: e.text,
        elementHtml: e.html,
        oldText: e.oldText,
        newText: e.newText,
      }).then((ok) => ok && say("Edit saved as a note. Send it to Claude when you're ready."));
    },
    onMiss: say,
  });

  const flip = useCallback(
    (step: 1 | -1) => {
      const i = FLIP_PAGES.findIndex((p) => p.id === pageId);
      const next = FLIP_PAGES[(i + step + FLIP_PAGES.length) % FLIP_PAGES.length];
      void go(next);
    },
    [pageId, go]
  );

  // Keys (when the studio, not the page, has focus): arrows flip, B C E pick a mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.closest("input, textarea, select, [contenteditable]") ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if (e.key === "ArrowRight") flip(1);
      else if (e.key === "ArrowLeft") flip(-1);
      else if (e.key === "Escape") setPick(null);
      else {
        const m = MODES.find((x) => x.key === e.key.toLowerCase());
        if (m) setMode(m.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip]);

  const viewAs = async (value: string) => {
    let input: ViewAsInput = { mode: "self" };
    if (value.startsWith("user:")) input = { mode: "user", userId: value.slice(5) };
    else if (value.startsWith("role:")) input = { mode: "role", role: value.slice(5) as "student" };
    setBusy(true);
    const res = await actionViewAs(input);
    setBusy(false);
    if (!res.ok) return say(res.error);
    const next = res.role
      ? { role: res.role, userId: input.mode === "user" ? input.userId : null, name: res.name }
      : null;
    setViewing(next);
    if (next?.userId) {
      roleAccount.current[next.role] = next.userId;
      save({ roleAccount: roleAccount.current });
    }
    setReloadKey((k) => k + 1);
    if (liveUrl) setSrc(liveUrl);
  };

  const device = DEVICES[viewport];
  const room = { w: device.width * scale, h: device.height * scale };
  const markable = Boolean(page && !page.redirects);

  return (
    <div className={styles.shell} data-panel={panel}>
      <PageList
        currentId={pageId}
        marks={marks}
        openNotes={openNotes}
        onOpen={(p) => void go(p)}
        onClose={() => setPanel("none")}
      />
      <main className={styles.main}>
        <Toolbar
          title={page?.title ?? "Not in the page list"}
          path={liveUrl ?? src ?? ""}
          hint={page?.hint}
          mode={mode}
          onMode={setMode}
          viewport={viewport}
          onViewport={(v) => {
            setViewport(v);
            save({ viewport: v });
          }}
          viewing={viewing}
          accounts={accounts}
          onViewAs={(v) => void viewAs(v)}
          matchPage={matchPage}
          onMatchPage={(on) => {
            setMatchPage(on);
            save({ matchPage: on });
          }}
          showEdits={showEdits}
          onShowEdits={setShowEdits}
          mark={pageId ? marks[pageId] : undefined}
          canMark={markable}
          onMark={async (m) => {
            if (!pageId) return;
            const next = marks[pageId] === m ? null : m;
            const res = await actionMarkPage({ pageKey: pageId, mark: next });
            if (!res.ok) return say(res.error);
            setMarks((all) => {
              const copy = { ...all };
              if (next) copy[pageId] = next;
              else delete copy[pageId];
              return copy;
            });
          }}
          onPrev={() => flip(-1)}
          onNext={() => flip(1)}
          onReload={() => {
            if (liveUrl) setSrc(liveUrl);
            setReloadKey((k) => k + 1);
          }}
          openHref={liveUrl ?? src ?? "/"}
          onPages={() => setPanel(panel === "pages" ? "none" : "pages")}
          onNotes={() => setPanel(panel === "notes" ? "none" : "notes")}
          noteCount={pageNotes.length}
          busy={busy}
        />
        {page?.hint && <p className={styles.hint}>{page.hint}</p>}
        <p className={styles.modeHint} aria-live="polite">
          {MODES.find((m) => m.id === mode)?.hint}
          {mode === "edit" && bridge.isEditing ? ". Enter keeps it, Escape undoes it." : ""}
          {viewing ? ` · Viewing as ${personaLabel(viewing)}` : ""}
        </p>
        {src && (
          <Frame
            frameRef={frameRef}
            src={src}
            reloadKey={reloadKey}
            viewport={viewport}
            scale={scale}
            onScale={setScale}
            hover={bridge.hover}
            selected={bridge.selected}
            pins={bridge.pins}
            activePin={activeNote}
            onPin={(id) => {
              setActiveNote(id);
              setPanel("notes");
            }}
            leftSite={leftSite}
            onBack={() => {
              setReloadKey((k) => k + 1);
              setLeftSite(false);
            }}
          >
            {pick && (
              <NoteComposer
                label={pick.whole ? "The whole page" : pick.label}
                box={pick.whole ? null : bridge.selected}
                room={room}
                saving={busy}
                onCancel={() => {
                  setPick(null);
                  bridge.clearSelection();
                }}
                onSave={async (category: NoteCategory, body: string) => {
                  const ok = await saveNote({
                    kind: "comment",
                    category,
                    body,
                    selector: pick.whole ? "" : pick.selector,
                    elementLabel: pick.whole ? "" : pick.label,
                    elementText: pick.whole ? "" : pick.text,
                    elementHtml: pick.whole ? "" : pick.html,
                  });
                  if (ok) {
                    setPick(null);
                    bridge.clearSelection();
                    say("Note saved. Send it to Claude when you're ready.");
                  }
                }}
              />
            )}
          </Frame>
        )}
        {toast && (
          <div className={styles.toast} role="status">
            {toast}
          </div>
        )}
      </main>
      <NotesPanel
        notes={visibleNotes}
        currentPageId={pageId}
        activeId={activeNote}
        busy={busy}
        onClose={() => setPanel("none")}
        onFocus={(n) => {
          setActiveNote(n.id);
          if (n.pageKey !== pageId) {
            const p = pageById(n.pageKey);
            if (p) {
              setPageId(p.id);
              setSrc(n.pagePath);
              setReloadKey((k) => k + 1);
            }
          } else if (n.selector && !bridge.focusSelector(n.selector)) {
            say("That element isn't on the page as it is now.");
          }
        }}
        onDelete={async (n) => {
          const res = await actionDeleteNote({ id: n.id });
          if (!res.ok) return say(res.error);
          setNotes((list) =>
            n.status === "draft"
              ? list.filter((x) => x.id !== n.id)
              : list.map((x) => (x.id === n.id ? { ...x, status: "dismissed" } : x))
          );
          if (n.kind === "copy" && n.pageKey === pageId) setReloadKey((k) => k + 1);
        }}
        onStatus={async (n, status) => {
          const res = await actionSetNoteStatus({ id: n.id, status });
          if (!res.ok) return say(res.error);
          setNotes((list) => list.map((x) => (x.id === n.id ? { ...x, status } : x)));
        }}
        onReply={async (n, body) => {
          const res = await actionReply({ id: n.id, body });
          if (!res.ok) {
            say(res.error);
            return false;
          }
          setNotes((list) =>
            list.map((x) =>
              x.id === n.id
                ? {
                    ...x,
                    status: "sent",
                    messages: [
                      ...x.messages,
                      {
                        id: `local-${Date.now()}`,
                        author: "founder",
                        body,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  }
                : x
            )
          );
          return true;
        }}
        onSend={async () => {
          setBusy(true);
          const res = await actionSendNotes({});
          setBusy(false);
          if (!res.ok) return say(res.error);
          setNotes((list) =>
            list.map((x) =>
              x.status === "draft" ? { ...x, status: "sent", sentAt: new Date().toISOString() } : x
            )
          );
          const copied = await navigator.clipboard?.writeText(res.brief).then(
            () => true,
            () => false
          );
          say(
            `Sent ${res.sent} ${res.sent === 1 ? "note" : "notes"} to Claude.${
              copied ? " The brief is copied too, if you'd rather paste it in chat." : ""
            }`
          );
        }}
        onCopyBrief={async () => {
          const res = await actionBrief();
          if (!res.ok) return say(res.error);
          const copied = await navigator.clipboard?.writeText(res.brief).then(
            () => true,
            () => false
          );
          say(
            copied
              ? "Copied. Paste it in your chat with Claude."
              : "Your browser didn't allow copying."
          );
        }}
        onCommentPage={() => {
          setMode("comment");
          setPick({ whole: true, selector: "", label: "", text: "", html: "" });
        }}
      />
      {panel !== "none" && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close"
          onClick={() => setPanel("none")}
        />
      )}
    </div>
  );
}
