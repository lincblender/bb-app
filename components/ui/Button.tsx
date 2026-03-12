import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}

const variantClasses = {
  primary: "bb-btn-primary",
  secondary: "bg-gray-700 bb-text-primary hover:bg-gray-600",
  outline: "border-2 bb-border-default bb-text-secondary bb-card-hover",
};

export function Button({
  children,
  href,
  variant = "primary",
  className,
  type = "button",
  onClick,
  disabled,
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-medium transition-colors";
  const classes = cn(baseClasses, variantClasses[variant], className);

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(classes, disabled && "cursor-not-allowed opacity-60")}
    >
      {children}
    </button>
  );
}
