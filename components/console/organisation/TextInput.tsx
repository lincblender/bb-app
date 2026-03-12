import { cn } from "@/lib/utils";

const INPUT_CLASSES =
  "mt-1 w-full rounded-lg border border-gray-600 bg-bb-dark px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral";

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(INPUT_CLASSES, className)}
    />
  );
}
