import { format } from "date-fns";

export function formatDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "No date";
  }

  return format(parsed, "dd MMM yyyy");
}
