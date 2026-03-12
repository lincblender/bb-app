"use client";

interface SocialProfileMatchRowProps {
  match: { url: string; handle: string };
  onSelect: (match: { url: string; handle: string }) => void;
}

export function SocialProfileMatchRow({ match, onSelect }: SocialProfileMatchRowProps) {
  const displayText = match.handle || match.url;

  return (
    <tr className="bg-gray-900/50 text-gray-300">
      <td className="px-4 py-2" colSpan={4}>
        <span className="truncate text-xs">{displayText}</span>
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={() => onSelect(match)}
          className="rounded border border-bb-powder-blue/50 bg-bb-powder-blue/10 px-2 py-1 text-xs font-medium text-bb-powder-blue hover:bg-bb-powder-blue/20"
        >
          Select
        </button>
      </td>
    </tr>
  );
}
