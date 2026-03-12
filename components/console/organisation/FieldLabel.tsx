interface FieldLabelProps {
  children: React.ReactNode;
}

export function FieldLabel({ children }: FieldLabelProps) {
  return (
    <label className="block text-sm font-medium text-gray-200">{children}</label>
  );
}
