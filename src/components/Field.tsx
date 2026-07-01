import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref,
) {
  const fileStyles =
    props.type === "file"
      ? "cursor-pointer py-2 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-neutral-800"
      : "";

  return (
    <input
      ref={ref}
      {...props}
      className={`min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200 ${fileStyles} ${className}`}
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
      className={`min-h-28 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200 ${className}`}
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
      className={`min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200 ${className}`}
    />
  );
});
