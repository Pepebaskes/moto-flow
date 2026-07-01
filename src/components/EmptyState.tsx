import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="font-semibold text-neutral-900">{title}</p>
      {children ? <div className="mt-2 text-sm text-neutral-500">{children}</div> : null}
    </div>
  );
}
