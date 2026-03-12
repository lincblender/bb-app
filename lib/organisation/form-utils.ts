/** Convert string array to newline-separated textarea value */
export function toTextareaValue(values: string[]): string {
  return values.join("\n");
}

/** Parse newline-separated textarea value to trimmed non-empty string array */
export function fromTextareaValue(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
