import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-[#FFF2E1]/75">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs font-semibold text-red-300">{error}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref,
) {
  const fileStyles =
    props.type === "file"
      ? "cursor-pointer py-2 file:mr-3 file:rounded-xl file:border-0 file:bg-[#F2B705] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#0B0B0B] hover:file:bg-[#FFD08A]"
      : "";

  return (
    <input
      ref={ref}
      {...props}
      className={`min-h-11 w-full rounded-2xl border border-white/10 bg-[#0B0B0B]/55 px-3 text-sm text-white outline-none transition placeholder:text-[#FFF2E1]/45 hover:border-[#F2B705]/35 focus:border-[#F2B705] focus:bg-[#0B0B0B]/80 focus:ring-2 focus:ring-[#F2B705]/20 ${fileStyles} ${className}`}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = "", ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`min-h-28 w-full rounded-2xl border border-white/10 bg-[#0B0B0B]/55 px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#FFF2E1]/45 hover:border-[#F2B705]/35 focus:border-[#F2B705] focus:bg-[#0B0B0B]/80 focus:ring-2 focus:ring-[#F2B705]/20 ${className}`}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      {...props}
      className={`min-h-11 w-full rounded-2xl border border-white/10 bg-[#0B0B0B]/55 px-3 text-sm text-white outline-none transition hover:border-[#F2B705]/35 focus:border-[#F2B705] focus:bg-[#0B0B0B]/80 focus:ring-2 focus:ring-[#F2B705]/20 ${className}`}
    />
  );
});
