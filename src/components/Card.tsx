import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-[#FFF2E1] shadow-xl shadow-black/20 backdrop-blur ${className}`}>{children}</section>;
}
