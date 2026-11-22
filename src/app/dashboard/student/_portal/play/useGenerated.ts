"use client";
// The admin-only "Generated" mark (Generator stream, src/components/admin/GeneratedMark.tsx): which
// of these questions the generator made, asked once of the server (generatedMarks), which answers
// only a real admin. A student always gets none, so no student sees the mark.
import { useEffect, useState } from "react";
import { generatedMarks } from "@/app/admin/generated/actions";

/** `ids` joined with commas, so the same list asks once. */
export function useGenerated(ids: string): Readonly<Record<string, true>> {
  const [marked, setMarked] = useState<Record<string, true>>({});
  useEffect(() => {
    if (!ids) return;
    let live = true;
    generatedMarks({ questionIds: ids.split(",") })
      .then((found) => live && setMarked(Object.fromEntries(found.map((id) => [id, true]))))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [ids]);
  return marked;
}
