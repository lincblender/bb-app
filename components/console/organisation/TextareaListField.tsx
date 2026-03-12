import { FieldLabel, TextArea } from "./index";
import { toTextareaValue, fromTextareaValue } from "@/lib/organisation/form-utils";

interface TextareaListFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  rows?: number;
  suggestions?: readonly string[];
}

export function TextareaListField({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
  suggestions,
}: TextareaListFieldProps) {
  const addSuggestion = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {suggestions && suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSuggestion(s)}
              className="rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-300 hover:border-bb-powder-blue hover:text-white"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <TextArea
        rows={rows}
        value={toTextareaValue(value)}
        onChange={(e) => onChange(fromTextareaValue(e.target.value))}
        placeholder={placeholder}
      />
    </div>
  );
}
