import React, { useState, useRef } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InventoryFilterPillProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

export function InventoryFilterPill({
  label,
  options,
  selectedValues,
  onChange,
}: InventoryFilterPillProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const hasSelection = selectedValues.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs border transition-colors whitespace-nowrap",
            hasSelection
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          )}
        >
          {label}
          {hasSelection && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-medium px-1">
              {selectedValues.length}
            </span>
          )}
          {hasSelection ? (
            <X className="w-3 h-3 ml-0.5" onClick={clearAll} />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filtered.length > 0 ? (
            filtered.map((opt) => {
              const isSelected = selectedValues.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={cn(
                    "w-full flex items-center gap-2 text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors",
                    isSelected && "text-primary"
                  )}
                >
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-input"
                    )}
                  >
                    {isSelected && (
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    )}
                  </div>
                  <span className="truncate">{opt}</span>
                </button>
              );
            })
          ) : (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No results
            </div>
          )}
        </div>
        {hasSelection && (
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-xs text-center py-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
