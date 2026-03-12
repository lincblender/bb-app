import { Card } from "@/components/ui/Card";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
      )}
      <div className="mt-5 space-y-4">{children}</div>
    </Card>
  );
}
