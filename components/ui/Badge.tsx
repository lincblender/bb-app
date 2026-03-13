import { cn } from "@/lib/utils";

type BadgeVariant = "positive" | "warning" | "negative" | "info" | "neutral" | "high" | "medium" | "low";

const variantClasses: Record<BadgeVariant, string> = {
  positive: "bg-bb-green text-white",
  warning: "bg-bb-orange text-white",
  negative: "bg-bb-red text-white",
  info: "bg-bb-blue text-white",
  neutral: "bg-gray-600 text-gray-200",
  high: "bg-bb-green text-white",
  medium: "bg-bb-orange text-white",
  low: "bg-bb-red text-white",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
