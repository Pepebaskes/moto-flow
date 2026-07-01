import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-neutral-950 text-white hover:bg-neutral-800",
  secondary: "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100",
  ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
