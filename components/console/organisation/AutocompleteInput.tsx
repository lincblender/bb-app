"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const INPUT_CLASSES =
  "mt-1 w-full rounded-lg border border-gray-600 bg-bb-dark px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral";

interface AutocompleteInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  maxSuggestions?: number;
}

export function AutocompleteInput({
  value,
  onChange,
  options,
  maxSuggestions = 8,
  className,
  ...props
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(value.toLowerCase().trim())
  );
  const suggestions = filtered.slice(0, maxSuggestions);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [value, suggestions.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && options.length > 0) setIsOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        {...props}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(INPUT_CLASSES, className)}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-600 bg-bb-dark py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={i === highlightIndex}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm text-gray-200",
                i === highlightIndex && "bg-bb-coral/20 text-white"
              )}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
