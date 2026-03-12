import { Plus, Trash2 } from "lucide-react";
import { TextInput, TextArea, FieldLabel, AutocompleteInput } from "./index";
import {
  INDIVIDUAL_QUALIFICATIONS,
  INDIVIDUAL_QUAL_ISSUERS,
} from "@/lib/organisation/suggestions";
import { toTextareaValue, fromTextareaValue } from "@/lib/organisation/form-utils";
interface IndividualQualificationItem {
  id?: string | null;
  name: string;
  issuer: string;
  count: number;
  holderNames?: string[];
}

interface IndividualQualificationsSectionProps {
  items: IndividualQualificationItem[];
  addLabel: string;
  emptyLabel: string;
  removeLabel: string;
  namePlaceholder: string;
  issuerPlaceholder: string;
  countPlaceholder: string;
  holderNamesPlaceholder: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (
    index: number,
    key: keyof IndividualQualificationItem,
    value: string | number | string[]
  ) => void;
}

export function IndividualQualificationsSection({
  items,
  addLabel,
  emptyLabel,
  removeLabel,
  namePlaceholder,
  issuerPlaceholder,
  countPlaceholder,
  holderNamesPlaceholder,
  onAdd,
  onRemove,
  onUpdate,
}: IndividualQualificationsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-gray-200">
          Individual qualifications
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:border-bb-powder-blue hover:text-white"
        >
          <Plus size={14} />
          {addLabel}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Person-level certs, degrees, or credentials (e.g. 8× AWS certified). Add
        holder names when known; map to profiles later.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        items.map((item, index) => (
          <div
            key={item.id ?? `individual-qualification-${index}`}
            className="space-y-3 rounded-xl border border-gray-700/70 bg-bb-dark p-4"
          >
            <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_80px_auto]">
              <AutocompleteInput
                value={item.name}
                onChange={(v) => onUpdate(index, "name", v)}
                options={[...INDIVIDUAL_QUALIFICATIONS]}
                placeholder={namePlaceholder}
                className="mt-0"
              />
              <AutocompleteInput
                value={item.issuer}
                onChange={(v) => onUpdate(index, "issuer", v)}
                options={[...INDIVIDUAL_QUAL_ISSUERS]}
                placeholder={issuerPlaceholder}
                className="mt-0"
              />
              <TextInput
                type="number"
                min={1}
                value={item.count}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  onUpdate(index, "count", Number.isNaN(n) ? 1 : Math.max(1, n));
                }}
                placeholder={countPlaceholder}
                className="mt-0"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-600 px-3 py-2 text-gray-300 hover:border-bb-orange hover:text-white"
                title={removeLabel}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div>
              <FieldLabel>{holderNamesPlaceholder}</FieldLabel>
              <TextArea
                rows={2}
                value={toTextareaValue(item.holderNames ?? [])}
                onChange={(e) =>
                  onUpdate(index, "holderNames", fromTextareaValue(e.target.value))
                }
                placeholder="Jane Smith, John Doe (one per line)"
                className="mt-1"
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
