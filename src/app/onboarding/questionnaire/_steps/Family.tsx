"use client";

import { Label } from "./shared";

export function FamilyStep(props: {
  parentEmail: string;
  setParentEmail: (v: string) => void;
  parentPhone: string;
  setParentPhone: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-taupe">
        Parents see your progress + chat history through the parent portal. Optional but
        recommended.
      </p>
      <div>
        <Label>Parent&apos;s email</Label>
        <input
          type="email"
          value={props.parentEmail}
          onChange={(e) => props.setParentEmail(e.target.value)}
          placeholder="parent@example.com"
          className="w-full rounded-lg border border-ivory/10 bg-surface/[0.03] px-3 py-2 text-sm text-ivory placeholder:text-taupe focus:border-info/40 focus:outline-none"
        />
      </div>
      <div>
        <Label>Parent&apos;s phone</Label>
        <input
          type="tel"
          value={props.parentPhone}
          onChange={(e) => props.setParentPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="w-full rounded-lg border border-ivory/10 bg-surface/[0.03] px-3 py-2 text-sm text-ivory placeholder:text-taupe focus:border-info/40 focus:outline-none"
        />
      </div>
    </div>
  );
}
