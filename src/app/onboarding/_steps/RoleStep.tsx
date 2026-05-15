"use client";

import { GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "./shared";

export function RoleStep({ role, onPick }: { role: Role; onPick: (r: Role) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        Who&apos;s filling this out?
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        We&apos;ll word the rest of the questions accordingly.
      </p>
      <div className="mt-6 space-y-3">
        <RoleOption
          icon={<GraduationCap className="h-5 w-5" />}
          label="I'm the student"
          desc="I want to improve my SAT score."
          active={role === "student"}
          onClick={() => onPick("student")}
        />
        <RoleOption
          icon={<Users className="h-5 w-5" />}
          label="I'm a parent"
          desc="I'm looking for prep for my child."
          active={role === "parent"}
          onClick={() => onPick("parent")}
        />
      </div>
    </div>
  );
}

function RoleOption({
  icon,
  label,
  desc,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
        active
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/40"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          active
            ? "bg-blue-500 text-white"
            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </button>
  );
}
