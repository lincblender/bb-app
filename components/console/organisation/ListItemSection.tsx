import { Plus, Trash2 } from "lucide-react";
import { TextInput, TextArea, AutocompleteInput } from "./index";

export interface ListSectionConfig {
  id: string;
  subtitle: string;
  hideSubtitle?: boolean;
  variant?: "stacked" | "badge";
  gridCols: string;
  rowFields: readonly {
    key: string;
    placeholder: string;
    suggestions?: readonly string[];
  }[];
  bottomField: { key: string; placeholder: string; rows: number } | null;
}

interface ListItemSectionProps<T extends Record<string, unknown>> {
  items: T[];
  config: ListSectionConfig;
  addLabel: string;
  emptyLabel: string;
  removeLabel: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, key: string, value: string) => void;
}

export function ListItemSection<T extends Record<string, unknown>>({
  items,
  config,
  addLabel,
  emptyLabel,
  removeLabel,
  onAdd,
  onRemove,
  onUpdate,
}: ListItemSectionProps<T>) {
  const { subtitle, hideSubtitle, gridCols, rowFields, bottomField, variant } = config;
  const isBadgeVariant = variant === "badge" && !bottomField;

  return (
    <div className="space-y-3">
      <div
        className={`flex items-center gap-3 ${hideSubtitle ? "justify-end" : "justify-between"}`}
      >
        {!hideSubtitle && (
          <h3 className="text-sm font-medium text-gray-200">{subtitle}</h3>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:border-bb-powder-blue hover:text-white"
        >
          <Plus size={14} />
          {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : isBadgeVariant ? (
        <div className="flex flex-wrap gap-3">
          {items.map((item, index) => (
            <div
              key={(item as { id?: string | null }).id ?? `${config.id}-${index}`}
              className="flex min-w-[300px] flex-1 flex-wrap items-center gap-2 rounded-full border border-gray-700/80 bg-bb-dark px-2.5 py-2"
            >
              {rowFields.map(({ key, placeholder, suggestions }, fieldIndex) => (
                <div
                  key={key}
                  className={fieldIndex === 0 ? "min-w-[180px] flex-1" : "min-w-[150px]"}
                >
                  {suggestions && suggestions.length > 0 ? (
                    <AutocompleteInput
                      value={String((item as Record<string, unknown>)[key] ?? "")}
                      onChange={(value) => onUpdate(index, key, value)}
                      options={suggestions}
                      placeholder={placeholder}
                      className={
                        fieldIndex === 0
                          ? "mt-0 rounded-full border-0 bg-transparent px-3 py-1.5 text-sm shadow-none focus:border-transparent focus:ring-0"
                          : "mt-0 rounded-full border border-gray-600 bg-bb-dark-elevated px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-gray-200"
                      }
                    />
                  ) : (
                    <TextInput
                      value={String((item as Record<string, unknown>)[key] ?? "")}
                      onChange={(event) => onUpdate(index, key, event.target.value)}
                      placeholder={placeholder}
                      className={
                        fieldIndex === 0
                          ? "mt-0 rounded-full border-0 bg-transparent px-3 py-1.5 text-sm shadow-none focus:border-transparent focus:ring-0"
                          : "mt-0 rounded-full border border-gray-600 bg-bb-dark-elevated px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-gray-200"
                      }
                    />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-600 text-gray-300 hover:border-bb-orange hover:text-white"
                title={removeLabel}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        items.map((item, index) => (
          <div
            key={(item as { id?: string | null }).id ?? `${config.id}-${index}`}
            className={`rounded-xl border border-gray-700/70 bg-bb-dark p-4 ${bottomField ? "space-y-3" : ""}`}
          >
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: gridCols }}
            >
              {rowFields.map(({ key, placeholder, suggestions }) =>
                suggestions && suggestions.length > 0 ? (
                  <AutocompleteInput
                    key={key}
                    value={String((item as Record<string, unknown>)[key] ?? "")}
                    onChange={(v) => onUpdate(index, key, v)}
                    options={suggestions}
                    placeholder={placeholder}
                    className="mt-0"
                  />
                ) : (
                  <TextInput
                    key={key}
                    value={String((item as Record<string, unknown>)[key] ?? "")}
                    onChange={(e) => onUpdate(index, key, e.target.value)}
                    placeholder={placeholder}
                    className="mt-0"
                  />
                )
              )}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-600 px-3 py-2 text-gray-300 hover:border-bb-orange hover:text-white"
                title={removeLabel}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {bottomField && (
              <TextArea
                rows={bottomField.rows}
                value={String((item as Record<string, unknown>)[bottomField.key] ?? "")}
                onChange={(e) => onUpdate(index, bottomField.key, e.target.value)}
                placeholder={bottomField.placeholder}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}
