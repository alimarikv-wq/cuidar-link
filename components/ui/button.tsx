import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-slate-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.16)] hover:bg-slate-800",
  secondary: "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
  ghost: "bg-transparent text-slate-700 ring-1 ring-transparent hover:bg-slate-100"
};

export function buttonStyles(variant: NonNullable<ButtonProps["variant"]> = "primary") {
  return cn(
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-70",
    variants[variant]
  );
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonStyles(variant), className)}
      {...props}
    />
  );
}
