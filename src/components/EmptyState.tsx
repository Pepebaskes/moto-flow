import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-8 text-center text-[#FFF2E1]">
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-2 text-sm text-[#FFF2E1]/60">{children}</div> : null}
    </div>
  );
}
