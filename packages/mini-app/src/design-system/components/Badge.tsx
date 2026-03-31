import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "accent" | "success" | "error" | "neutral";
  size?: "sm" | "md";
}

const variants = {
  primary: "bg-brand-primary/10 text-brand-primary",
  accent: "bg-brand-accent/15 text-amber-800",
  success: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-700",
  neutral: "bg-gray-100 text-gray-600",
};

export function Badge({ children, variant = "primary", size = "sm" }: BadgeProps) {
  const sizes = {
    sm: "px-2.5 py-0.5 text-[11px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}
