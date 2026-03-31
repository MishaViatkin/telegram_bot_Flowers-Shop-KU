import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  loading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 active:scale-[0.97] select-none";

  const variants = {
    primary:
      "bg-brand-primary text-white shadow-[var(--shadow-card)] hover:bg-brand-primary-dark hover:shadow-[var(--shadow-card-hover)]",
    secondary:
      "bg-brand-accent text-brand-text shadow-[var(--shadow-card)] hover:bg-brand-accent-dark",
    outline:
      "border-2 border-brand-primary text-brand-primary bg-transparent hover:bg-brand-primary/5",
    ghost: "text-brand-primary bg-transparent hover:bg-brand-primary/5",
  };

  const sizes = {
    sm: "px-4 py-2 text-[13px] gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base w-full gap-2",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        disabled || loading ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
