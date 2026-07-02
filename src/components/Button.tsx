import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-[#F2B705] text-[#0B0B0B] shadow-lg shadow-black/20 hover:bg-[#FFD08A]",
  secondary: "border border-white/10 bg-white/8 text-[#FFF2E1] hover:border-[#F2B705]/35 hover:bg-white/12",
  ghost: "text-[#FFF2E1]/75 hover:bg-white/8 hover:text-white",
  danger: "bg-red-500 text-white shadow-lg shadow-red-950/20 hover:bg-red-400",
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
      className={`inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
