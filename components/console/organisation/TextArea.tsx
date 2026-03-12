import { cn } from "@/lib/utils";

const TEXTAREA_CLASSES =
  "mt-1 w-full rounded-lg border border-gray-600 bg-bb-dark px-3 py-2.5 text-sm leading-relaxed text-gray-100 placeholder-gray-500 focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral";

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(TEXTAREA_CLASSES, className)}
    />
  );
}
